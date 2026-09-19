import { getOrCreateAppSettings, serializeFormSettings } from "./app-settings.server";
import { adminClientFor } from "./shopify/client.server";
import { fetchOrderContext } from "./shopify/orders.server";
import { expiredWithdrawalMessage, resolveWithdrawalWindow } from "./withdrawal-deadline.server";
import { findOpenWithdrawalRequest } from "./withdrawal-request.server";

// Why a customer can't submit. The code lets the extension pick its own copy
// if it wants to; the message is the fallback it can render as-is.
export class WithdrawalNotAllowedError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "WithdrawalNotAllowedError";
    this.code = code;
  }
}

/**
 * The single source of truth for "can this order still be withdrawn from".
 * Used by the eligibility endpoint (to render the form or an explanation) and
 * again at submission (because the client can't be trusted with the answer).
 *
 * `surface` picks which per-surface enable flag gates the form: the order
 * status page (default, unchanged behavior) or the storefront theme app
 * extension's standalone page.
 */
const SURFACE_FLAGS = {
  order_status: "showOnOrderStatus",
  standalone_page: "showOnStandalonePage",
};

export async function resolveWithdrawalEligibility(shop, orderId, { surface = "order_status" } = {}) {
  const settings = serializeFormSettings(await getOrCreateAppSettings(shop));
  const surfaceFlag = SURFACE_FLAGS[surface] ?? SURFACE_FLAGS.order_status;

  if (!settings.masterEnabled || !settings[surfaceFlag]) {
    return {
      isEligible: false,
      code: "form_disabled",
      message: "",
      stage: "before_delivery",
      window: null,
    };
  }

  const admin = await adminClientFor(shop);
  const orderContext = await fetchOrderContext(admin, orderId);

  if (!orderContext) {
    return {
      isEligible: false,
      code: "order_not_found",
      message: "We couldn't find this order.",
      stage: "before_delivery",
      window: null,
    };
  }

  if (orderContext.cancelledAt) {
    return {
      isEligible: false,
      code: "order_cancelled",
      message: "This order has been cancelled, so there's nothing to withdraw from.",
      stage: orderContext.isDelivered ? "delivered" : "before_delivery",
      window: null,
    };
  }

  // Which set of merchant copy applies. Resolved on every call rather than
  // cached, so an order that gets marked delivered between two visits to the
  // order status page shows the delivered wording on the second one.
  const stage = orderContext.isDelivered ? "delivered" : "before_delivery";

  const existing = await findOpenWithdrawalRequest(shop, orderId);
  if (existing) {
    return {
      isEligible: false,
      code: "already_requested",
      message: "We've already received a withdrawal request for this order and are reviewing it.",
      stage,
      window: null,
      existingRequestId: existing.id,
    };
  }

  const window = resolveWithdrawalWindow(orderContext, settings.deadline);
  if (!window.isEligible) {
    return {
      isEligible: false,
      code: "deadline_passed",
      message: expiredWithdrawalMessage(window),
      stage,
      window,
    };
  }

  return { isEligible: true, code: null, message: "", stage, window };
}

/** Throws WithdrawalNotAllowedError unless the order can still be withdrawn from. */
export async function assertWithdrawalAllowed(shop, orderId, options) {
  const eligibility = await resolveWithdrawalEligibility(shop, orderId, options);
  if (!eligibility.isEligible) {
    throw new WithdrawalNotAllowedError(
      eligibility.code,
      eligibility.message || "This order is no longer eligible for withdrawal.",
    );
  }
  return eligibility;
}
