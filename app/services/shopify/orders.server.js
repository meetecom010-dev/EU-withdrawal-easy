import { adminMutation, adminQuery } from "./client.server";
import { HOLD_HANDLE_PREFIX } from "./fulfillment-holds.server";

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
          deliveryMethod {
            methodType
          }
          fulfillmentHolds {
            handle
          }
        }
      }
    }
  }
`;

// The line-level detail of what's still waiting to ship, for holding exactly
// the withdrawn items on a partly shipped order. Kept out of
// ORDER_CONTEXT_QUERY because nesting line items under every fulfillment order
// multiplies the query cost past Shopify's per-query limit, and only the
// partly shipped path needs it.
const UNSHIPPED_LINES_QUERY = `#graphql
  query WithdrawalUnshippedLines($id: ID!) {
    order(id: $id) {
      id
      fulfillmentOrders(first: 10) {
        nodes {
          id
          status
          deliveryMethod {
            methodType
          }
          lineItems(first: 25) {
            nodes {
              id
              remainingQuantity
              requiresShipping
              variant {
                id
              }
              lineItem {
                id
              }
            }
          }
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
      closed
      closedAt
      tags
      displayFinancialStatus
      displayFulfillmentStatus
      totalPriceSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } }
      totalRefundedSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } }
      totalShippingPriceSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } }
      fulfillments(first: 20) {
        deliveredAt
        displayStatus
      }
      fulfillmentOrders(first: 20) {
        nodes { id status requestStatus deliveryMethod { methodType } }
      }
      returns(first: 10) {
        nodes { id name status }
      }
      refunds(first: 20) {
        id
        createdAt
        totalRefundedSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } }
      }
      lineItems(first: 100) {
        nodes {
          id
          title
          quantity
          refundableQuantity
          currentQuantity
          unfulfilledQuantity
          requiresShipping
          variant { id }
          discountedUnitPriceSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } }
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

// Finds one order by its order name (e.g. "#1001"), for the storefront
// withdrawal-theme-block's lookup step, which has no session token or
// confirmation number to key off — just what the customer types in.
// Deliberately fetches everything the lookup response needs (order identity,
// delivery state for the eligibility stage, and full line item detail for the
// "choose items" step) in one round trip.
const ORDER_LOOKUP_QUERY = `#graphql
  query WithdrawalOrderLookup($query: String!) {
    orders(first: 1, query: $query) {
      nodes {
        id
        name
        email
        cancelledAt
        shippingAddress {
          address1
          address2
          city
          provinceCode
          zip
          countryCode
        }
        fulfillments(first: 20) {
          deliveredAt
          displayStatus
        }
        lineItems(first: 100) {
          nodes {
            id
            title
            quantity
            refundableQuantity
            sku
            image {
              url
              altText
            }
            discountedUnitPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            variant {
              id
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
  }
`;

// Fulfillment orders in these states are done with — holding them is either
// impossible or meaningless.
const HOLDABLE_STATUSES = new Set(["OPEN", "IN_PROGRESS", "SCHEDULED"]);

// Fulfillment orders in these states still have goods that haven't left.
// ON_HOLD counts: a held item is exactly one that's waiting to ship.
const AWAITING_SHIPMENT_STATUSES = new Set(["OPEN", "IN_PROGRESS", "SCHEDULED", "ON_HOLD"]);

// Whether a fulfillment order still has physical goods to send. Digital and
// other no-shipping items (delivery method NONE) are skipped: they often never
// get a fulfillment, and counting them would keep a split order "waiting" for
// a parcel that will never exist.
function isAwaitingShipment(fulfillmentOrder) {
  return (
    AWAITING_SHIPMENT_STATUSES.has(fulfillmentOrder.status) &&
    fulfillmentOrder.deliveryMethod?.methodType !== "NONE"
  );
}

// Held by this app for a withdrawal: the goods in it were withdrawn, so the
// customer isn't waiting for them.
function isHeldForWithdrawal(fulfillmentOrder) {
  return (fulfillmentOrder.fulfillmentHolds ?? []).some((hold) =>
    hold.handle?.startsWith(HOLD_HANDLE_PREFIX),
  );
}

/**
 * Which half of the merchant's automation applies to an order:
 *
 *   nothing fulfilled                  -> "before_ship"
 *   some fulfilled, some still to ship -> "partially_shipped" (both halves,
 *                                         each scoped to the matching items)
 *   everything fulfilled               -> "after_delivery"
 */
export function fulfillmentBranch({ isFulfilled, hasUnshippedItems }) {
  if (!isFulfilled) return "before_ship";
  return hasUnshippedItems ? "partially_shipped" : "after_delivery";
}

// "1001" / "#1001" / " 1001 " -> "#1001" — the format Shopify's order search
// query expects and the only one worth guessing at from free-text customer
// input.
function normalizeOrderName(input) {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

// Looks up an order by name and verifies the requester actually owns it via
// the order's contact email — the only two facts a storefront visitor (no
// session token, no confirmation number) can be asked for. Returns null on
// any mismatch, deliberately without distinguishing "order not found" from
// "wrong email" so the response can't be used to probe for valid order
// numbers.
export async function findOrderForWithdrawalLookup(admin, { orderName, email }) {
  const name = normalizeOrderName(orderName);
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  if (!name || !normalizedEmail) return null;

  const data = await adminQuery(admin, {
    operation: "WithdrawalOrderLookup",
    query: ORDER_LOOKUP_QUERY,
    variables: { query: `name:${JSON.stringify(name)}` },
  });

  const order = data.orders?.nodes?.[0];
  if (!order || String(order.email ?? "").trim().toLowerCase() !== normalizedEmail) {
    return null;
  }

  const fulfillments = order.fulfillments ?? [];
  const isDelivered = fulfillments.some(
    (fulfillment) => Boolean(fulfillment.deliveredAt) || fulfillment.displayStatus === "DELIVERED",
  );

  const lineItems = (order.lineItems?.nodes ?? []).map((line) => {
    const variantTitle = (line.variant?.selectedOptions ?? [])
      .map((option) => option.value)
      .filter(Boolean)
      .join(" / ");
    const price = line.discountedUnitPriceSet?.shopMoney;
    return {
      id: line.id,
      title: line.title,
      variantId: line.variant?.id ?? null,
      variantTitle,
      sku: line.sku ?? "",
      imageUrl: line.image?.url ?? "",
      imageAlt: line.image?.altText ?? line.title,
      quantity: line.quantity,
      refundableQuantity: line.refundableQuantity ?? 0,
      price: price ? { amount: Number(price.amount), currencyCode: price.currencyCode } : null,
    };
  });

  const address = order.shippingAddress;
  const shippingAddress = address
    ? {
        countryCode: address.countryCode ?? "",
        formatted: [address.address1, address.address2, address.city, address.provinceCode, address.zip, address.countryCode]
          .filter(Boolean)
          .join(", "),
      }
    : null;

  return {
    id: order.id,
    name: order.name,
    email: order.email,
    cancelledAt: order.cancelledAt,
    isDelivered,
    shippingAddress,
    lineItems,
  };
}

export async function fetchOrderContext(admin, orderId) {
  const data = await adminQuery(admin, {
    operation: "WithdrawalOrderContext",
    query: ORDER_CONTEXT_QUERY,
    variables: { id: orderId },
  });

  const order = data.order;
  if (!order) return null;

  const fulfillments = order.fulfillments ?? [];
  const fulfillmentOrders = order.fulfillmentOrders?.nodes ?? [];
  const isFulfilled = fulfillments.length > 0;
  const hasUnshippedItems = fulfillmentOrders.some(isAwaitingShipment);
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
    // Anything already fulfilled means those goods have left. What's still
    // unshipped on a split order is covered by hasUnshippedItems below.
    isFulfilled,
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
    // Goods that haven't shipped yet, which is what the partly shipped
    // automation holds.
    hasUnshippedItems,
    // Unshipped goods the customer is still waiting to receive. This keeps the
    // withdrawal window open on a split order (it runs from receipt of the
    // *last* item). Items this app held because they were withdrawn don't
    // count: they'll never be sent, and counting them would keep the window
    // open forever for the goods that were delivered.
    awaitingDelivery: fulfillmentOrders.some(
      (fulfillmentOrder) =>
        isAwaitingShipment(fulfillmentOrder) && !isHeldForWithdrawal(fulfillmentOrder),
    ),
    branch: fulfillmentBranch({ isFulfilled, hasUnshippedItems }),
    holdableFulfillmentOrders: fulfillmentOrders.filter((fulfillmentOrder) =>
      HOLDABLE_STATUSES.has(fulfillmentOrder.status),
    ),
  };
}

/**
 * The individual fulfillment order lines still waiting to ship, with the ids a
 * line-level hold needs. Lines already on hold are included (they haven't
 * shipped, so they can't be returned) but flagged `holdable: false`, since a
 * second hold isn't what they need.
 */
export async function fetchUnshippedLines(admin, orderId) {
  const data = await adminQuery(admin, {
    operation: "WithdrawalUnshippedLines",
    query: UNSHIPPED_LINES_QUERY,
    variables: { id: orderId },
  });

  const lines = [];
  for (const fulfillmentOrder of data.order?.fulfillmentOrders?.nodes ?? []) {
    if (!isAwaitingShipment(fulfillmentOrder)) continue;
    for (const line of fulfillmentOrder.lineItems?.nodes ?? []) {
      if (!line.requiresShipping || line.remainingQuantity <= 0) continue;
      lines.push({
        fulfillmentOrderId: fulfillmentOrder.id,
        fulfillmentOrderLineItemId: line.id,
        remainingQuantity: line.remainingQuantity,
        holdable: HOLDABLE_STATUSES.has(fulfillmentOrder.status),
        variantId: line.variant?.id ?? null,
        lineItemId: line.lineItem?.id ?? null,
      });
    }
  }
  return lines;
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

// Reads the presentment-money amount off a MoneyBag field — the currency the
// customer actually saw and paid in at checkout (their storefront currency),
// not the shop's home currency. Same convention refunds.server.js already
// uses for the refund preview/create flow; falls back to shop money only if
// a MoneyBag somehow has no presentment value.
function moneyAmount(moneyBag) {
  const amount = moneyBag?.presentmentMoney?.amount ?? moneyBag?.shopMoney?.amount;
  return amount == null ? 0 : Number(amount);
}

function moneyCurrency(moneyBag) {
  return moneyBag?.presentmentMoney?.currencyCode ?? moneyBag?.shopMoney?.currencyCode ?? null;
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
  // Same rules the automation uses (fetchOrderContext), so the page offers the
  // actions for the branch the automation actually ran.
  const isFulfilled = fulfillments.length > 0;
  const fulfillmentOrders = order.fulfillmentOrders?.nodes ?? [];
  const hasUnshippedItems = fulfillmentOrders.some(isAwaitingShipment);

  const lineItems = (order.lineItems?.nodes ?? []).map((line) => ({
    id: line.id,
    title: line.title,
    quantity: line.quantity,
    refundableQuantity: line.refundableQuantity ?? 0,
    // Units still on the order (quantity minus removed/refunded units) and how
    // many of those haven't been sent, for the per-item shipping badge on a
    // split order. Null for items that never ship (digital goods): no badge.
    currentQuantity: line.currentQuantity ?? line.quantity,
    unshippedQuantity: line.requiresShipping ? line.unfulfilledQuantity ?? 0 : null,
    variantId: line.variant?.id ?? null,
    unitAmount: moneyAmount(line.discountedUnitPriceSet),
    currencyCode: moneyCurrency(line.discountedUnitPriceSet),
  }));

  const currencyCode = moneyCurrency(order.totalPriceSet) ?? lineItems[0]?.currencyCode ?? null;

  return {
    id: order.id,
    name: order.name,
    createdAt: order.createdAt,
    cancelledAt: order.cancelledAt,
    closed: order.closed ?? false,
    closedAt: order.closedAt ?? null,
    tags: order.tags ?? [],
    financialStatus: order.displayFinancialStatus ?? null,
    fulfillmentStatus: order.displayFulfillmentStatus ?? null,
    currencyCode,
    totalPrice: moneyAmount(order.totalPriceSet),
    totalRefunded: moneyAmount(order.totalRefundedSet),
    totalShipping: moneyAmount(order.totalShippingPriceSet),
    isFulfilled,
    isDelivered: deliveredFulfillments.length > 0,
    deliveredAt: deliveredFulfillments[0]?.deliveredAt ?? null,
    hasUnshippedItems,
    branch: fulfillmentBranch({ isFulfilled, hasUnshippedItems }),
    holdableFulfillmentOrders: fulfillmentOrders.filter((fulfillmentOrder) =>
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
