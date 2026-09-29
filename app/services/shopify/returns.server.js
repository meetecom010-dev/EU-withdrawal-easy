import { adminMutation, adminQuery } from "./client.server";
import { message as msg } from "../../i18n/errors";

// returnCreate works in FulfillmentLineItem ids, so submitted items have to be
// translated. The join key is the *product variant*, not the line id: what the
// order status extension exposes as `line.id` is a `gid://shopify/CartLine/…`,
// which is a different id space from `gid://shopify/LineItem/…` and which
// Shopify documents as unstable ("may change after any operations on the line
// items, so avoid persisting them"). Matching on it never hits.
//
// The query also reports how many of each line are still returnable — a line
// already returned or refunded comes back with a smaller quantity, or not at
// all.
const RETURNABLE_FULFILLMENTS_QUERY = `#graphql
  query WithdrawalReturnable($orderId: ID!) {
    returnableFulfillments(orderId: $orderId, first: 20) {
      nodes {
        id
        returnableFulfillmentLineItems(first: 100) {
          nodes {
            quantity
            fulfillmentLineItem {
              id
              lineItem {
                id
                title
                variant {
                  id
                }
              }
            }
          }
        }
      }
    }
  }
`;

// ReturnLineItemInput.returnReason is a required ReturnReason enum on this
// API version. OTHER is the honest classification for a statutory withdrawal —
// none of the merchandising reasons (SIZE_TOO_SMALL, DEFECTIVE, WRONG_ITEM…)
// describes it — and OTHER is exactly the value Shopify pairs with a free-text
// returnReasonNote, which carries the customer's own words.
//
// (An earlier revision tried returnReasonDefinitionId, a field that only
// exists from 2026-04. The app's Admin client runs 2025-10, where the
// returnReasonDefinitions query doesn't exist at all — that mismatch was the
// "Field 'returnReasonDefinitions' doesn't exist on type 'QueryRoot'" error.)
const RETURN_REASON = "OTHER";

const RETURN_CREATE_MUTATION = `#graphql
  mutation WithdrawalReturnCreate($returnInput: ReturnInput!) {
    returnCreate(returnInput: $returnInput) {
      return {
        id
        status
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

/**
 * Everything still returnable on the order, indexed both ways so a submitted
 * item can be matched on whichever identifier it carries. A single key can hold
 * several entries: one order line can be split across shipments, and two order
 * lines can share a variant.
 *
 * @returns {Promise<{ byVariantId: Map<string, object[]>, byLineItemId: Map<string, object[]>, available: object[] }>}
 */
export async function fetchReturnableLines(admin, orderId) {
  const data = await adminQuery(admin, {
    operation: "WithdrawalReturnable",
    query: RETURNABLE_FULFILLMENTS_QUERY,
    variables: { orderId },
  });

  const byVariantId = new Map();
  const byLineItemId = new Map();
  // Kept for the automation log: when nothing matches, the merchant needs to
  // see what the order actually had, not just that the match failed.
  const available = [];

  const push = (map, key, value) => {
    if (!key) return;
    const existing = map.get(key) ?? [];
    existing.push(value);
    map.set(key, existing);
  };

  for (const fulfillment of data.returnableFulfillments?.nodes ?? []) {
    for (const entry of fulfillment.returnableFulfillmentLineItems?.nodes ?? []) {
      const fulfillmentLineItem = entry.fulfillmentLineItem;
      const lineItem = fulfillmentLineItem?.lineItem;
      if (!fulfillmentLineItem?.id || !lineItem) continue;

      const candidate = {
        fulfillmentLineItemId: fulfillmentLineItem.id,
        returnableQuantity: entry.quantity,
        lineItemId: lineItem.id,
        // Null for a deleted variant or a custom line item — such a line simply
        // can't be matched by variant, and is reported rather than dropped.
        variantId: lineItem.variant?.id ?? null,
        title: lineItem.title ?? "",
      };

      push(byVariantId, candidate.variantId, candidate);
      push(byLineItemId, candidate.lineItemId, candidate);
      available.push(candidate);
    }
  }

  return { byVariantId, byLineItemId, available };
}

// Turns the request's snapshotted items into returnCreate input. This is where
// partial withdrawals are honoured: only the lines the customer selected, each
// clamped to what Shopify still considers returnable.
//
// Returns the usable input alongside the lines that couldn't be matched, so the
// caller can record a partial result instead of silently dropping items.
export function buildReturnLineItems(items, returnable, { returnReasonNote }) {
  const returnLineItems = [];
  const unreturnable = [];
  // Tracks how much of each fulfillment line item this return has already
  // claimed, so two submitted items sharing one variant can't both be granted
  // the same returnable units.
  const claimed = new Map();

  for (const item of items) {
    // Variant first: it's the only identifier the order status extension gives
    // that means the same thing on both sides. lineItemId is the fallback for
    // requests submitted by other paths (or future ones) that carry a real
    // LineItem id.
    const candidates =
      (item.variantId ? returnable.byVariantId.get(item.variantId) : null) ??
      (item.lineId ? returnable.byLineItemId.get(item.lineId) : null) ??
      [];
    let remaining = Math.max(1, item.quantity ?? 1);

    if (candidates.length === 0) {
      unreturnable.push({
        lineId: item.lineId,
        variantId: item.variantId ?? null,
        title: item.title,
        reason: item.variantId ? "not_returnable" : "no_variant_id_on_request",
      });
      continue;
    }

    for (const candidate of candidates) {
      if (remaining <= 0) break;
      const alreadyClaimed = claimed.get(candidate.fulfillmentLineItemId) ?? 0;
      const stillAvailable = candidate.returnableQuantity - alreadyClaimed;
      const quantity = Math.min(remaining, stillAvailable);
      if (quantity <= 0) continue;

      claimed.set(candidate.fulfillmentLineItemId, alreadyClaimed + quantity);
      returnLineItems.push({
        fulfillmentLineItemId: candidate.fulfillmentLineItemId,
        quantity,
        // Both required by ReturnLineItemInput. The note is capped at 255
        // characters (Shopify rejects longer), and truncated rather than
        // dropped so a long customer reason can't fail the whole return.
        returnReason: RETURN_REASON,
        returnReasonNote: (returnReasonNote ?? "").slice(0, 255),
      });
      remaining -= quantity;
    }

    if (remaining > 0) {
      unreturnable.push({
        lineId: item.lineId,
        variantId: item.variantId ?? null,
        title: item.title,
        reason: "insufficient_returnable_quantity",
        shortfall: remaining,
      });
    }
  }

  return { returnLineItems, unreturnable };
}


// ReturnInput.notifyCustomer is deprecated and ignored by Shopify, so it isn't
// passed — the customer already knows, they just submitted the form, and the
// merchant's own return notification settings govern anything further.
export async function createReturn(admin, { orderId, returnLineItems }) {
  const payload = await adminMutation(admin, {
    operation: "WithdrawalReturnCreate",
    query: RETURN_CREATE_MUTATION,
    variables: { returnInput: { orderId, returnLineItems } },
    payloadKey: "returnCreate",
  });

  return payload.return ?? null;
}

// ── Processing a return (receive + refund in one step) ──────────────────────
// The same thing Shopify's own "Process and refund" button on the order page
// does: returnProcess marks the returned units processed and, through
// financialTransfer, refunds them to the original payment method. The amount
// comes from the return's suggestedFinancialOutcome, so staff confirm the exact
// figure Shopify will move.

// What's on a return and how much of each line is still waiting to be
// processed. fulfillmentLineItem links a return line back to its order line,
// which is how the refund button knows which units the return already covers.
const RETURN_DETAIL_QUERY = `#graphql
  query WithdrawalReturnDetail($id: ID!) {
    return(id: $id) {
      id
      name
      status
      returnLineItems(first: 50) {
        nodes {
          id
          quantity
          processableQuantity
          unprocessedQuantity
          ... on ReturnLineItem {
            fulfillmentLineItem {
              lineItem {
                id
                title
                variant {
                  id
                }
              }
            }
          }
        }
      }
    }
  }
`;

const RETURN_OUTCOME_QUERY = `#graphql
  query WithdrawalReturnOutcome(
    $id: ID!
    $returnLineItems: [SuggestedOutcomeReturnLineItemInput!]!
    $refundShipping: RefundShippingInput
  ) {
    return(id: $id) {
      suggestedFinancialOutcome(
        returnLineItems: $returnLineItems
        exchangeLineItems: []
        refundShipping: $refundShipping
      ) {
        shipping {
          amountSet { presentmentMoney { amount currencyCode } }
        }
        financialTransfer {
          ... on RefundReturnOutcome {
            suggestedTransactions {
              amountSet { presentmentMoney { amount currencyCode } }
              parentTransaction { id }
            }
          }
        }
      }
    }
  }
`;

const RETURN_PROCESS_MUTATION = `#graphql
  mutation WithdrawalReturnProcess($input: ReturnProcessInput!) {
    returnProcess(input: $input) {
      return {
        id
        status
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export async function fetchReturnDetail(admin, returnId) {
  const data = await adminQuery(admin, {
    operation: "WithdrawalReturnDetail",
    query: RETURN_DETAIL_QUERY,
    variables: { id: returnId },
  });
  const ret = data.return;
  if (!ret) return null;

  return {
    id: ret.id,
    name: ret.name,
    status: ret.status,
    lines: (ret.returnLineItems?.nodes ?? []).map((line) => ({
      id: line.id,
      quantity: line.quantity,
      processableQuantity: line.processableQuantity ?? 0,
      unprocessedQuantity: line.unprocessedQuantity ?? 0,
      lineItemId: line.fulfillmentLineItem?.lineItem?.id ?? null,
      variantId: line.fulfillmentLineItem?.lineItem?.variant?.id ?? null,
      title: line.fulfillmentLineItem?.lineItem?.title ?? "",
    })),
  };
}

/**
 * What processing the return would do, with no side effects: the lines still
 * to process and the refund Shopify suggests for them. `includeShipping` asks
 * for the original delivery charge too (a full withdrawal); Shopify only ever
 * suggests what's still refundable, so it can't be refunded twice.
 */
export async function previewReturnProcess(admin, returnId, { includeShipping = false } = {}) {
  const detail = await fetchReturnDetail(admin, returnId);
  if (!detail) return { processable: false, status: null, lines: [] };

  const lines = detail.lines.filter((line) => line.processableQuantity > 0);
  if (detail.status !== "OPEN" || lines.length === 0) {
    return { processable: false, status: detail.status, name: detail.name, lines: [] };
  }

  const data = await adminQuery(admin, {
    operation: "WithdrawalReturnOutcome",
    query: RETURN_OUTCOME_QUERY,
    variables: {
      id: returnId,
      returnLineItems: lines.map((line) => ({ id: line.id, quantity: line.processableQuantity })),
      refundShipping: includeShipping ? { fullRefund: true } : null,
    },
  });
  const outcome = data.return?.suggestedFinancialOutcome;
  const suggested = (outcome?.financialTransfer?.suggestedTransactions ?? [])
    .map((transaction) => ({
      parentId: transaction.parentTransaction?.id ?? null,
      amount: Number(transaction.amountSet?.presentmentMoney?.amount ?? 0),
      currencyCode: transaction.amountSet?.presentmentMoney?.currencyCode ?? null,
    }))
    .filter((transaction) => transaction.amount > 0);
  const transactions = suggested.filter((transaction) => transaction.parentId);
  // A suggested refund with no parent transaction can't be issued through
  // returnProcess. Processing anyway would close the return having refunded
  // only part of the amount (or none of it), so the whole refund is refused
  // and staff process it in Shopify instead.
  const refundSupported = transactions.length === suggested.length;
  const shippingAmount = Number(outcome?.shipping?.amountSet?.presentmentMoney?.amount ?? 0);

  return {
    processable: true,
    status: detail.status,
    name: detail.name,
    lines: lines.map((line) => ({ ...line, quantity: line.processableQuantity })),
    amount: transactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    currencyCode:
      transactions[0]?.currencyCode ?? outcome?.shipping?.amountSet?.presentmentMoney?.currencyCode ?? null,
    includesShipping: includeShipping && shippingAmount > 0,
    shippingAmount: includeShipping ? shippingAmount : 0,
    refundSupported,
    transactions,
  };
}

// Processes every still-processable line on the return and refunds it, the
// customer notified by Shopify. Recomputes the plan rather than trusting the
// preview the dialog showed, so a return touched in the meantime can't be
// over-refunded.
export async function processReturnWithRefund(admin, returnId, { includeShipping, note }) {
  const plan = await previewReturnProcess(admin, returnId, { includeShipping });
  if (!plan.processable) {
    const error = new Error("Return: there's nothing left to process on this return");
    error.activityMessage = msg("returnNothingToProcess");
    error.logData = { returnId, status: plan.status };
    throw error;
  }
  // "Process and refund" must refund. With nothing to refund (already paid
  // back some other way) or a payment it can't refund, processing would close
  // the return without the customer getting their money from this action.
  if (!(plan.amount > 0) || !plan.refundSupported) {
    const error = new Error(
      plan.refundSupported
        ? "Return: there's nothing left to refund on this return"
        : "Return: this payment can't be refunded from the app. Process the return in Shopify.",
    );
    error.activityMessage = msg(
      plan.refundSupported ? "returnNothingToRefund" : "returnPaymentUnsupported",
    );
    error.logData = { returnId, amount: plan.amount, refundSupported: plan.refundSupported };
    throw error;
  }

  const input = {
    returnId,
    returnLineItems: plan.lines.map((line) => ({ id: line.id, quantity: line.quantity })),
    notifyCustomer: true,
    note,
  };
  if (plan.includesShipping) input.refundShipping = { fullRefund: true };
  input.financialTransfer = {
    issueRefund: {
      orderTransactions: plan.transactions.map((transaction) => ({
        parentId: transaction.parentId,
        transactionAmount: { amount: transaction.amount, currencyCode: transaction.currencyCode },
      })),
    },
  };

  const payload = await adminMutation(admin, {
    operation: "WithdrawalReturnProcess",
    query: RETURN_PROCESS_MUTATION,
    variables: { input },
    payloadKey: "returnProcess",
  });

  return {
    status: payload.return?.status ?? null,
    amount: plan.amount,
    currencyCode: plan.currencyCode,
    lineCount: plan.lines.length,
  };
}
