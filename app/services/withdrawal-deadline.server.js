// Decides whether an order is still inside its withdrawal window.
//
// Under the EU consumer rights directive the withdrawal period runs from the
// day the goods are *received*, not the day they're ordered, and the customer
// may also withdraw at any point before receipt. That shapes the rules here:
//
//   not fulfilled yet  -> the window hasn't started; always eligible
//   fulfilled, delivery date known    -> deliveredAt + daysAfterDelivery
//   fulfilled, delivery date unknown  -> estimate it, then + daysAfterDelivery
//
// Carriers frequently never report a delivery date, which is exactly what the
// merchant's "Estimated transit days" setting is for: shipped date + transit
// days stands in for the missing delivery date.

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// The delivery date to count from, and how confident we are about it. Picks
// the *latest* fulfillment: with a split shipment the window can't fairly
// close before the last parcel has landed.
function resolveDeliveryDate(fulfillments, estimatedTransitDays) {
  let best = null;

  for (const fulfillment of fulfillments) {
    const delivered = parseDate(fulfillment.deliveredAt);
    if (delivered) {
      if (!best || best.basis !== "delivered" || delivered > best.date) {
        best = { date: delivered, basis: "delivered" };
      }
      continue;
    }

    // Prefer the carrier's own estimate over our flat transit-days guess when
    // one is available — it accounts for the actual service and destination.
    const carrierEstimate = parseDate(fulfillment.estimatedDeliveryAt);
    const shippedAt = parseDate(fulfillment.createdAt);
    const candidate =
      carrierEstimate ?? (shippedAt ? addDays(shippedAt, estimatedTransitDays) : null);
    if (!candidate) continue;

    const basis = carrierEstimate ? "carrier_estimate" : "transit_estimate";
    // A real delivered date always wins over any estimate.
    if (!best || (best.basis !== "delivered" && candidate > best.date)) {
      best = { date: candidate, basis };
    }
  }

  return best;
}

/**
 * @param {{ fulfillments?: Array<object>, isFulfilled?: boolean }} orderContext
 * @param {{ daysAfterDelivery: number, estimatedTransitDays: number }} deadline
 * @param {Date} [now]
 */
export function resolveWithdrawalWindow(orderContext, deadline, now = new Date()) {
  const daysAfterDelivery = Number(deadline?.daysAfterDelivery);
  const estimatedTransitDays = Number(deadline?.estimatedTransitDays);

  // A misconfigured deadline must not silently lock every customer out of a
  // right they legally have, so an unusable setting fails open.
  if (!Number.isFinite(daysAfterDelivery) || daysAfterDelivery <= 0) {
    return {
      isEligible: true,
      hasStarted: false,
      basis: "unconfigured",
      deliveryDate: null,
      expiresAt: null,
      daysRemaining: null,
    };
  }

  const fulfillments = orderContext?.fulfillments ?? [];
  const delivery = resolveDeliveryDate(
    fulfillments,
    Number.isFinite(estimatedTransitDays) && estimatedTransitDays >= 0 ? estimatedTransitDays : 0,
  );

  // Nothing shipped, or shipped with no usable date anywhere: the clock hasn't
  // started. Withdrawing before receipt is explicitly allowed.
  if (!delivery) {
    return {
      isEligible: true,
      hasStarted: false,
      basis: fulfillments.length === 0 ? "not_shipped" : "no_delivery_date",
      deliveryDate: null,
      expiresAt: null,
      daysRemaining: null,
    };
  }

  const expiresAt = addDays(delivery.date, daysAfterDelivery);
  const isEligible = now <= expiresAt;

  return {
    isEligible,
    hasStarted: now >= delivery.date,
    basis: delivery.basis,
    deliveryDate: delivery.date,
    expiresAt,
    daysRemaining: isEligible ? Math.ceil((expiresAt - now) / DAY_MS) : 0,
  };
}

// The message the order status page shows when the window has closed. Kept
// here next to the rule that produces it so the two can't drift.
export function expiredWithdrawalMessage(window) {
  if (!window?.expiresAt) {
    return "The withdrawal period for this order has ended.";
  }
  const formatted = window.expiresAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `The withdrawal period for this order ended on ${formatted}. Contact us if you think this is wrong.`;
}
