import { adminMutation, adminQuery } from "./client.server";

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

// ReturnLineItemInput.returnReason is deprecated in favour of
// returnReasonDefinitionId, and the definitions are per shop — so the id has
// to be looked up rather than hardcoded.
const RETURN_REASON_DEFINITIONS_QUERY = `#graphql
  query WithdrawalReturnReasonDefinitions {
    returnReasonDefinitions(first: 50) {
      nodes {
        id
        handle
        name
      }
    }
  }
`;

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

// A statutory withdrawal isn't a merchandising complaint, so the generic
// reason is the honest one — "too small" would misreport why the goods came
// back. Shops can rename or remove the built-in definitions, hence the
// fallback chain and the null return: omitting the reason entirely is valid,
// and the customer's own words still travel in returnReasonNote.
const PREFERRED_REASON_HANDLES = ["other", "unwanted", "not-as-described"];

export async function resolveReturnReasonDefinitionId(admin) {
  const data = await adminQuery(admin, {
    operation: "WithdrawalReturnReasonDefinitions",
    query: RETURN_REASON_DEFINITIONS_QUERY,
  });

  const definitions = data.returnReasonDefinitions?.nodes ?? [];
  for (const handle of PREFERRED_REASON_HANDLES) {
    const match = definitions.find((definition) => definition.handle === handle);
    if (match) return match.id;
  }
  return null;
}

// Turns the request's snapshotted items into returnCreate input. This is where
// partial withdrawals are honoured: only the lines the customer selected, each
// clamped to what Shopify still considers returnable.
//
// Returns the usable input alongside the lines that couldn't be matched, so the
// caller can record a partial result instead of silently dropping items.
export function buildReturnLineItems(
  items,
  returnable,
  { returnReasonNote, returnReasonDefinitionId },
) {
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
        returnReasonNote,
        // Omitted entirely when the shop has no matching definition —
        // ReturnLineItemInput accepts a note without a reason, and the legacy
        // `returnReason` enum is deprecated.
        ...(returnReasonDefinitionId ? { returnReasonDefinitionId } : {}),
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
