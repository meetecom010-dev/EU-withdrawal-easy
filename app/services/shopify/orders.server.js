import { adminMutation, adminQuery } from "./client.server";

// Everything the automation and the deadline calculation need about an order,
// in one round trip: fulfillment state (which branch applies), delivery dates
// (when the withdrawal window closes), and the open fulfillment orders (what
// to hold).
const ORDER_CONTEXT_QUERY = `#graphql
  query WithdrawalOrderContext($id: ID!) {
    order(id: $id) {
      id
      name
      confirmationNumber
      createdAt
      email
      cancelledAt
      displayFulfillmentStatus
      fulfillments(first: 20) {
        id
        createdAt
        deliveredAt
        estimatedDeliveryAt
        displayStatus
      }
      fulfillmentOrders(first: 20) {
        nodes {
          id
          status
          requestStatus
        }
      }
    }
  }
`;

const TAGS_ADD_MUTATION = `#graphql
  mutation WithdrawalTagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      userErrors {
        field
        message
      }
    }
  }
`;

const TAGS_REMOVE_MUTATION = `#graphql
  mutation WithdrawalTagsRemove($id: ID!, $tags: [String!]!) {
    tagsRemove(id: $id, tags: $tags) {
      userErrors {
        field
        message
      }
    }
  }
`;

// Everything the admin *detail page* needs about an order in one round trip, on
// top of what fetchOrderContext already covers: live tags (the source of truth
// for the Order tags section), money/financial state (for refund display and
// gating), open returns, and per-line refundable quantities (to map the
// withdrawn items to a refund and to know whether a refund is even possible).
const ORDER_ADMIN_STATE_QUERY = `#graphql
  query WithdrawalOrderAdminState($id: ID!) {
    order(id: $id) {
      id
      name
      createdAt
      cancelledAt
      tags
      displayFinancialStatus
      displayFulfillmentStatus
      totalPriceSet { shopMoney { amount currencyCode } }
      totalRefundedSet { shopMoney { amount currencyCode } }
      fulfillments(first: 20) {
        deliveredAt
        displayStatus
      }
      fulfillmentOrders(first: 20) {
        nodes { id status requestStatus }
      }
      returns(first: 10) {
        nodes { id name status }
      }
      refunds(first: 20) {
        id
        createdAt
        totalRefundedSet { shopMoney { amount currencyCode } }
      }
      lineItems(first: 100) {
        nodes {
          id
          title
          quantity
          refundableQuantity
          variant { id }
          discountedUnitPriceSet { shopMoney { amount currencyCode } }
        }
      }
    }
  }
`;

const ORDER_CANCEL_MUTATION = `#graphql
  mutation WithdrawalOrderCancel(
    $orderId: ID!
    $refundMethod: OrderCancelRefundMethodInput!
    $restock: Boolean!
    $reason: OrderCancelReason!
    $notifyCustomer: Boolean
    $staffNote: String
  ) {
    orderCancel(
      orderId: $orderId
      refundMethod: $refundMethod
      restock: $restock
      reason: $reason
      notifyCustomer: $notifyCustomer
      staffNote: $staffNote
    ) {
      job {
        id
        done
      }
      orderCancelUserErrors {
        field
        message
        code
      }
    }
  }
`;

// Fulfillment orders in these states are done with — holding them is either
// impossible or meaningless.
const HOLDABLE_STATUSES = new Set(["OPEN", "IN_PROGRESS", "SCHEDULED"]);

export async function fetchOrderContext(admin, orderId) {
  const data = await adminQuery(admin, {
    operation: "WithdrawalOrderContext",
    query: ORDER_CONTEXT_QUERY,
    variables: { id: orderId },
  });

  const order = data.order;
  if (!order) return null;

  const fulfillments = order.fulfillments ?? [];
  // Delivery is per-fulfillment — the order-level displayFulfillmentStatus
  // only goes as far as FULFILLED and never reports delivery. Both signals are
  // checked because carriers are inconsistent: some report a deliveredAt
  // timestamp, others only flip displayStatus to DELIVERED.
  const deliveredFulfillments = fulfillments.filter(
    (fulfillment) => Boolean(fulfillment.deliveredAt) || fulfillment.displayStatus === "DELIVERED",
  );

  return {
    id: order.id,
    name: order.name,
    confirmationNumber: order.confirmationNumber,
    createdAt: order.createdAt,
    email: order.email,
    cancelledAt: order.cancelledAt,
    displayFulfillmentStatus: order.displayFulfillmentStatus,
    fulfillments,
    // Anything already fulfilled means the goods have left, so the hold branch
    // no longer applies even if the order isn't marked delivered yet.
    isFulfilled: fulfillments.length > 0,
    // Whether the customer has goods in hand, which is what decides the copy
    // the order status page shows. Deliberately a different question from
    // isFulfilled: an in-transit order runs the after-delivery *automation*
    // (a hold is impossible once shipped) but must still show the pre-delivery
    // copy, because the delivered wording says the order has arrived.
    //
    // One delivered parcel is enough on a split shipment — the customer is
    // looking at goods they've received, and telling them the order hasn't
    // arrived would be plainly wrong.
    isDelivered: deliveredFulfillments.length > 0,
    deliveredAt: deliveredFulfillments[0]?.deliveredAt ?? null,
    holdableFulfillmentOrders: (order.fulfillmentOrders?.nodes ?? []).filter((fulfillmentOrder) =>
      HOLDABLE_STATUSES.has(fulfillmentOrder.status),
    ),
  };
}

export async function addOrderTags(admin, orderId, tags) {
  const cleaned = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  if (cleaned.length === 0) return [];

  await adminMutation(admin, {
    operation: "WithdrawalTagsAdd",
    query: TAGS_ADD_MUTATION,
    variables: { id: orderId, tags: cleaned },
    payloadKey: "tagsAdd",
  });

  return cleaned;
}

export async function removeOrderTags(admin, orderId, tags) {
  const cleaned = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  if (cleaned.length === 0) return [];

  await adminMutation(admin, {
    operation: "WithdrawalTagsRemove",
    query: TAGS_REMOVE_MUTATION,
    variables: { id: orderId, tags: cleaned },
    payloadKey: "tagsRemove",
  });

  return cleaned;
}

// Reads the shop-money amount off a MoneyBag field, as a number.
function moneyAmount(moneyBag) {
  const amount = moneyBag?.shopMoney?.amount;
  return amount == null ? 0 : Number(amount);
}

// The live order state the detail page renders from and gates its actions on.
// Fails soft at the call site: a null here means "couldn't reach Shopify", and
// the page falls back to the stored request with actions disabled.
export async function fetchOrderAdminState(admin, orderId) {
  const data = await adminQuery(admin, {
    operation: "WithdrawalOrderAdminState",
    query: ORDER_ADMIN_STATE_QUERY,
    variables: { id: orderId },
  });

  const order = data.order;
  if (!order) return null;

  const fulfillments = order.fulfillments ?? [];
  const deliveredFulfillments = fulfillments.filter(
    (fulfillment) => Boolean(fulfillment.deliveredAt) || fulfillment.displayStatus === "DELIVERED",
  );
  // Anything fulfilled means the goods have left, so the hold branch no longer
  // applies — same rule the automation uses (fetchOrderContext).
  const isFulfilled = fulfillments.length > 0;

  const lineItems = (order.lineItems?.nodes ?? []).map((line) => ({
    id: line.id,
    title: line.title,
    quantity: line.quantity,
    refundableQuantity: line.refundableQuantity ?? 0,
    variantId: line.variant?.id ?? null,
    unitAmount: moneyAmount(line.discountedUnitPriceSet),
    currencyCode: line.discountedUnitPriceSet?.shopMoney?.currencyCode ?? null,
  }));

  const currencyCode =
    order.totalPriceSet?.shopMoney?.currencyCode ?? lineItems[0]?.currencyCode ?? null;

  return {
    id: order.id,
    name: order.name,
    createdAt: order.createdAt,
    cancelledAt: order.cancelledAt,
    tags: order.tags ?? [],
    financialStatus: order.displayFinancialStatus ?? null,
    fulfillmentStatus: order.displayFulfillmentStatus ?? null,
    currencyCode,
    totalPrice: moneyAmount(order.totalPriceSet),
    totalRefunded: moneyAmount(order.totalRefundedSet),
    isFulfilled,
    isDelivered: deliveredFulfillments.length > 0,
    deliveredAt: deliveredFulfillments[0]?.deliveredAt ?? null,
    branch: isFulfilled ? "after_delivery" : "before_ship",
    holdableFulfillmentOrders: (order.fulfillmentOrders?.nodes ?? []).filter((fulfillmentOrder) =>
      HOLDABLE_STATUSES.has(fulfillmentOrder.status),
    ),
    returns: (order.returns?.nodes ?? []).map((ret) => ({
      id: ret.id,
      name: ret.name,
      status: ret.status,
    })),
    refunds: (order.refunds ?? []).map((refund) => ({
      id: refund.id,
      createdAt: refund.createdAt,
      amount: moneyAmount(refund.totalRefundedSet),
    })),
    lineItems,
    // Whether any unit is still refundable, to gate the refund action.
    hasRefundableItems: lineItems.some((line) => line.refundableQuantity > 0),
  };
}

// Cancels with a refund to the original payment method — the "Cancel and
// refund" fallbacks. Shopify runs this as a background job, so `job.done`
// being false isn't a failure; it means the cancellation was accepted and is
// processing.
//
// notifyCustomer is true because the customer asked for this: they submitted a
// withdrawal and the order is being cancelled as a result. Silence would be
// worse than a duplicate email.
export async function cancelOrderWithRefund(admin, orderId, { staffNote }) {
  const payload = await adminMutation(admin, {
    operation: "WithdrawalOrderCancel",
    query: ORDER_CANCEL_MUTATION,
    variables: {
      orderId,
      refundMethod: { originalPaymentMethodsRefund: true },
      restock: true,
      reason: "CUSTOMER",
      notifyCustomer: true,
      staffNote,
    },
    payloadKey: "orderCancel",
    userErrorKeys: ["orderCancelUserErrors"],
  });

  return payload.job ?? null;
}
