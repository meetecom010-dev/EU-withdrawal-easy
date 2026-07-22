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
