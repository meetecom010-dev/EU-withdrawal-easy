import { adminMutation, adminQuery } from "./client.server";

// Guided refund for a withdrawal: refund exactly the withdrawn items (mapped to
// the order's refundable line items by product variant, the same join key
// returns use). When the withdrawal is for the whole order, the original
// standard delivery charge is refunded too, as the EU right of withdrawal
// requires; a partial withdrawal refunds items only. Shopify's own
// `suggestedRefund` computes the exact money to move (amounts, restock, and the
// transactions against the original payment), so the merchant reviews a real
// figure and the refund matches what Shopify would do in its own admin.

const REFUNDABLE_LINE_ITEMS_QUERY = `#graphql
  query WithdrawalRefundableLines($orderId: ID!) {
    order(id: $orderId) {
      lineItems(first: 100) {
        nodes {
          id
          refundableQuantity
          variant { id }
        }
      }
    }
  }
`;

// suggestedRefund is an Order field taking the lines (and optional shipping) to
// refund, and returns the exact amount, per-line restock, and the transactions
// to run against the original payment method.
const SUGGESTED_REFUND_QUERY = `#graphql
  query WithdrawalSuggestedRefund(
    $orderId: ID!
    $refundLineItems: [RefundLineItemInput!]
    $refundShipping: Boolean
  ) {
    order(id: $orderId) {
      suggestedRefund(refundLineItems: $refundLineItems, refundShipping: $refundShipping) {
        amountSet { presentmentMoney { amount currencyCode } }
        refundLineItems {
          lineItem { id }
          quantity
          restockType
          location { id }
        }
        shipping { amountSet { presentmentMoney { amount } } }
        suggestedTransactions {
          amountSet { presentmentMoney { amount currencyCode } }
          gateway
          kind
          parentTransaction { id }
        }
      }
    }
  }
`;

const REFUND_CREATE_MUTATION = `#graphql
  mutation WithdrawalRefundCreate($input: RefundInput!) {
    refundCreate(input: $input) {
      refund { id }
      userErrors { field message }
    }
  }
`;

async function fetchRefundableLineItems(admin, orderId) {
  const data = await adminQuery(admin, {
    operation: "WithdrawalRefundableLines",
    query: REFUNDABLE_LINE_ITEMS_QUERY,
    variables: { orderId },
  });
  return (data.order?.lineItems?.nodes ?? []).map((line) => ({
    id: line.id,
    variantId: line.variant?.id ?? null,
    refundableQuantity: line.refundableQuantity ?? 0,
  }));
}

// Maps the request's withdrawn items to refundable order lines by variant,
// clamped to what's still refundable — mirrors buildReturnLineItems so a
// withdrawal's refund and return always agree on which units they touch.
function mapItemsToRefundInput(items, refundable) {
  const byVariant = new Map();
  for (const line of refundable) {
    if (!line.variantId) continue;
    const existing = byVariant.get(line.variantId) ?? [];
    existing.push(line);
    byVariant.set(line.variantId, existing);
  }

  const claimed = new Map();
  const refundLineItems = [];
  for (const item of items) {
    const candidates = item.variantId ? byVariant.get(item.variantId) ?? [] : [];
    let remaining = Math.max(1, item.quantity ?? 1);
    for (const candidate of candidates) {
      if (remaining <= 0) break;
      const already = claimed.get(candidate.id) ?? 0;
      const available = candidate.refundableQuantity - already;
      const quantity = Math.min(remaining, available);
      if (quantity <= 0) continue;
      claimed.set(candidate.id, already + quantity);
      refundLineItems.push({ lineItemId: candidate.id, quantity });
      remaining -= quantity;
    }
  }
  return refundLineItems;
}

// The refund line input for the withdrawn items, plus shipping only when the
// withdrawal covers the whole order (EU right of withdrawal). Nothing here can
// over-refund a partial withdrawal — only the withdrawn lines are ever included.
async function buildRefundPlan(admin, orderId, { items, isFullWithdrawal }) {
  const refundable = await fetchRefundableLineItems(admin, orderId);
  return {
    refundLineItems: mapItemsToRefundInput(items, refundable),
    // suggestedRefund.refundShipping is a Boolean — true asks Shopify to include
    // a full shipping refund in the suggestion (the RefundShippingInput shape is
    // only for the refundCreate mutation's `shipping` field).
    refundShipping: Boolean(isFullWithdrawal),
  };
}

async function fetchSuggestedRefund(admin, orderId, { refundLineItems, refundShipping }) {
  const data = await adminQuery(admin, {
    operation: "WithdrawalSuggestedRefund",
    query: SUGGESTED_REFUND_QUERY,
    variables: { orderId, refundLineItems, refundShipping },
  });
  return data.order?.suggestedRefund ?? null;
}

// The amount a refund would move, for the confirmation dialog — no side effects.
export async function previewWithdrawalRefund(admin, orderId, { items, isFullWithdrawal }) {
  const plan = await buildRefundPlan(admin, orderId, { items, isFullWithdrawal });
  if (plan.refundLineItems.length === 0) {
    return { refundable: false, amount: 0, currencyCode: null };
  }
  const suggested = await fetchSuggestedRefund(admin, orderId, plan);
  return {
    refundable: true,
    amount: Number(suggested?.amountSet?.presentmentMoney?.amount ?? 0),
    currencyCode: suggested?.amountSet?.presentmentMoney?.currencyCode ?? null,
    includesShipping: Boolean(
      isFullWithdrawal && Number(suggested?.shipping?.amountSet?.presentmentMoney?.amount ?? 0) > 0,
    ),
    lineCount: plan.refundLineItems.length,
  };
}

// Issues the refund to the original payment method, using Shopify's suggested
// per-line restock and transactions so the money and inventory match its own
// admin. Returns the refund id and the amount moved.
export async function createWithdrawalRefund(admin, orderId, { items, isFullWithdrawal, note }) {
  const plan = await buildRefundPlan(admin, orderId, { items, isFullWithdrawal });
  if (plan.refundLineItems.length === 0) {
    const error = new Error("Refund: none of the items on this request are refundable");
    error.logData = { items: items?.map((i) => ({ title: i.title, variantId: i.variantId })) };
    throw error;
  }

  const suggested = await fetchSuggestedRefund(admin, orderId, plan);
  if (!suggested) {
    throw new Error("Refund: Shopify returned no suggested refund for these items");
  }

  // Every amount below is presentment money — what the customer actually paid
  // in. RefundInput.currency must be that presentment currency, and it is
  // *required* whenever it differs from the shop currency: left unset Shopify
  // falls back to the shop currency and rejects the refund with "Currency must
  // match parent transaction". OrderTransactionInput has no currency field of
  // its own, so this one value is what the transaction amounts are read in.
  const input = {
    orderId,
    currency: suggested.amountSet?.presentmentMoney?.currencyCode,
    note: note ?? "Refunded by EU Withdrawly: customer withdrew from the purchase.",
    notify: true,
    refundLineItems: (suggested.refundLineItems ?? []).map((line) => ({
      lineItemId: line.lineItem.id,
      quantity: line.quantity,
      restockType: line.restockType,
      locationId: line.location?.id,
    })),
    transactions: (suggested.suggestedTransactions ?? []).map((transaction) => ({
      orderId,
      parentId: transaction.parentTransaction?.id,
      gateway: transaction.gateway,
      kind: "REFUND",
      amount: transaction.amountSet.presentmentMoney.amount,
    })),
  };
  // Full withdrawal → also refund the original standard delivery charge.
  if (isFullWithdrawal && Number(suggested.shipping?.amountSet?.presentmentMoney?.amount ?? 0) > 0) {
    input.shipping = { fullRefund: true };
  }

  const payload = await adminMutation(admin, {
    operation: "WithdrawalRefundCreate",
    query: REFUND_CREATE_MUTATION,
    variables: { input },
    payloadKey: "refundCreate",
  });

  return {
    refundId: payload.refund?.id ?? null,
    amount: Number(suggested.amountSet?.presentmentMoney?.amount ?? 0),
    currencyCode: suggested.amountSet?.presentmentMoney?.currencyCode ?? null,
  };
}
