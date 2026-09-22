import {
  createWithdrawalRequest,
  DuplicateWithdrawalRequestError,
} from "./withdrawal-request.server";
import { runWithdrawalAutomation } from "./withdrawal-automation.server";
import { assertWithdrawalAllowed, WithdrawalNotAllowedError } from "./withdrawal-eligibility.server";
import { FORM_EVENT_TYPES, recordFormEvent } from "./form-events/index.server";

// The full withdrawal-request submission flow, shared by every surface that
// can submit one (today: the order-status extension and the storefront theme
// app extension) — deadline check, DB write, funnel event, then automation.
// Returns a plain { status, body } pair so each route's thin wrapper just
// does `Response.json(body, { status })`, whatever its own auth mechanism is.
//
// `surface` is passed straight through to assertWithdrawalAllowed so it
// checks the right per-surface enable flag; omit it for the order-status
// page's default behavior.
export async function submitWithdrawalRequestFlow(shop, body, { surface } = {}) {
  if (!body?.orderId || !Array.isArray(body.items) || body.items.length === 0) {
    return { status: 400, body: { error: "orderId and at least one item are required" } };
  }

  // The deadline is enforced here, not on the client. The client can be
  // replayed with an expired order, and the settings that define the window
  // are deliberately never sent to the storefront.
  try {
    await assertWithdrawalAllowed(shop, body.orderId, { surface });
  } catch (error) {
    if (error instanceof WithdrawalNotAllowedError) {
      return { status: 422, body: { error: error.message, code: error.code } };
    }
    throw error;
  }

  // Record which surface this came from, derived from the calling route's
  // `surface` (never the client) so the admin can show where a request
  // originated. Anything that isn't the theme app extension's standalone page
  // is the order status page.
  const source = surface === "standalone_page" ? "standalone_page" : "order_status";

  let withdrawalRequest;
  try {
    withdrawalRequest = await createWithdrawalRequest(shop, {
      orderId: body.orderId,
      orderName: body.orderName ?? "",
      customerName: body.customerName ?? "",
      customerEmail: body.customerEmail ?? "",
      countryCode: body.countryCode ?? "",
      locale: typeof body.locale === "string" ? body.locale : "",
      shippingAddress: body.shippingAddress ?? "",
      reason: body.reason ?? "",
      orderLineCount: typeof body.orderLineCount === "number" ? body.orderLineCount : null,
      source,
      items: body.items,
    });
  } catch (error) {
    if (error instanceof DuplicateWithdrawalRequestError) {
      return {
        status: 409,
        body: {
          error: "A withdrawal request for this order is already being reviewed.",
          code: "duplicate_request",
        },
      };
    }
    throw error;
  }

  // The submission point in the funnel. Carries sessionId so it links to the
  // button_viewed / form_opened events the client emitted before a request
  // existed. Recorded before the automation runs, which streams its own events.
  await recordFormEvent(shop, withdrawalRequest.orderId, {
    type: FORM_EVENT_TYPES.FORM_SUBMITTED,
    status: "ok",
    withdrawalRequestId: withdrawalRequest.id,
    sessionId: typeof body.sessionId === "string" ? body.sessionId : null,
    message: "Customer submitted the withdrawal form",
  });

  // Run the automation inline so a hold lands within seconds rather than
  // waiting for the next cron tick. It never throws — failures are recorded on
  // the request for staff — so the customer's submission is acknowledged
  // either way.
  const withAutomation = await runWithdrawalAutomation(shop, withdrawalRequest.id);

  return { status: 201, body: { withdrawalRequest: withAutomation ?? withdrawalRequest } };
}
