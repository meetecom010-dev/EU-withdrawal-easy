import { adminMutation, ShopifyApiError } from "./client.server";

const HOLD_MUTATION = `#graphql
  mutation WithdrawalFulfillmentHold($id: ID!, $fulfillmentHold: FulfillmentOrderHoldInput!) {
    fulfillmentOrderHold(id: $id, fulfillmentHold: $fulfillmentHold) {
      fulfillmentOrder {
        id
        status
        fulfillmentHolds {
          id
          reason
          reasonNotes
          handle
        }
      }
      remainingFulfillmentOrder {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const RELEASE_HOLD_MUTATION = `#graphql
  mutation WithdrawalReleaseHold($id: ID!, $holdIds: [ID!], $externalId: String) {
    fulfillmentOrderReleaseHold(id: $id, holdIds: $holdIds, externalId: $externalId) {
      fulfillmentOrder {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Each hold this app places carries a handle derived from the request, which
// is what lets us find our own holds again among any the merchant or other
// apps have placed. Shopify allows 10 active holds per app per fulfillment
// order, and the handle also makes a retried hold idempotent rather than
// stacking a second one.
export const HOLD_HANDLE_PREFIX = "eu-withdrawly-";

export function holdHandleFor(requestId) {
  return `${HOLD_HANDLE_PREFIX}${requestId}`;
}

// `lineItems` ([{ id, quantity }] of FulfillmentOrderLineItem ids) holds only
// those units: Shopify splits them into their own fulfillment order and leaves
// the rest free to ship. Omitted, the whole fulfillment order is held.
export async function holdFulfillmentOrder(
  admin,
  { fulfillmentOrderId, requestId, reasonNotes, lineItems },
) {
  const handle = holdHandleFor(requestId);
  const payload = await adminMutation(admin, {
    operation: "WithdrawalFulfillmentHold",
    query: HOLD_MUTATION,
    variables: {
      id: fulfillmentOrderId,
      fulfillmentHold: {
        // OTHER with a note is the honest classification — none of the stock
        // reasons (out of stock, fraud risk, incorrect address) describes a
        // statutory withdrawal, and picking a wrong one would mislead staff
        // reading the order timeline.
        reason: "OTHER",
        reasonNotes,
        handle,
        // Surfaces the hold in the merchant's own notifications rather than
        // relying on them to notice a held order.
        notifyMerchant: true,
        ...(lineItems?.length ? { fulfillmentOrderLineItems: lineItems } : {}),
      },
    },
    payloadKey: "fulfillmentOrderHold",
  });

  const fulfillmentOrder = payload.fulfillmentOrder;
  const holds = (fulfillmentOrder?.fulfillmentHolds ?? []).filter(
    (hold) => hold.handle === handle,
  );

  // Without ids we could never release precisely, and releasing imprecisely
  // means dropping other people's holds. Better to fail loudly here.
  if (holds.length === 0) {
    throw new ShopifyApiError(
      `Hold placed on ${fulfillmentOrderId} but no hold id came back for handle ${handle}`,
      { operation: "WithdrawalFulfillmentHold" },
    );
  }

  return {
    // After a line-level hold the held units live on a new fulfillment order,
    // and that's the one the release has to target.
    fulfillmentOrderId: fulfillmentOrder?.id ?? fulfillmentOrderId,
    holdIds: holds.map((hold) => hold.id),
    status: fulfillmentOrder?.status ?? null,
  };
}

// `holdIds` is deliberately required here. fulfillmentOrderReleaseHold treats
// an omitted list as "release everything", which would also release holds this
// app never placed and ship an order the merchant was deliberately holding.
export async function releaseFulfillmentHold(admin, { fulfillmentOrderId, holdIds, externalId }) {
  if (!Array.isArray(holdIds) || holdIds.length === 0) {
    throw new Error("releaseFulfillmentHold requires the hold ids this app placed");
  }

  const payload = await adminMutation(admin, {
    operation: "WithdrawalReleaseHold",
    query: RELEASE_HOLD_MUTATION,
    variables: { id: fulfillmentOrderId, holdIds, externalId },
    payloadKey: "fulfillmentOrderReleaseHold",
  });

  return payload.fulfillmentOrder ?? null;
}
