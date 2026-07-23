import { authenticate } from "../../shopify.server";
import {
  createWithdrawalRequest,
  DuplicateWithdrawalRequestError,
} from "../../services/withdrawal-request.server";
import { runWithdrawalAutomation } from "../../services/withdrawal-automation.server";
import { assertWithdrawalAllowed, WithdrawalNotAllowedError } from "../../services/withdrawal-eligibility.server";
import { FORM_EVENT_TYPES, recordFormEvent } from "../../services/form-events/index.server";

// POST /api/public-withdrawal-requests -> records a withdrawal request
// submitted from the order-status extension (extensions/order-status-hello),
// then runs the merchant's configured automation against the Shopify order.
// Verified via the extension's session token, same as
// app/routes/api/public-form-settings.jsx — see that file for why `dest`
// is read as a bare domain instead of parsed with `new URL()`.
async function handleRequest(request) {
  const { sessionToken, cors } = await authenticate.public.customerAccount(request);
  const shop = sessionToken.dest.replace(/^https?:\/\//, "");

  if (request.method !== "POST") {
    return cors(Response.json({ error: "Method not allowed" }, { status: 405 }));
  }

  const body = await request.json();
  if (!body?.orderId || !Array.isArray(body.items) || body.items.length === 0) {
    return cors(
      Response.json({ error: "orderId and at least one item are required" }, { status: 400 }),
    );
  }

  // The deadline is enforced here, not in the extension. The client can be
  // replayed with an expired order, and the settings that define the window
  // are deliberately never sent to the storefront.
  try {
    await assertWithdrawalAllowed(shop, body.orderId);
  } catch (error) {
    if (error instanceof WithdrawalNotAllowedError) {
      return cors(Response.json({ error: error.message, code: error.code }, { status: 422 }));
    }
    throw error;
  }

  let withdrawalRequest;
  try {
    withdrawalRequest = await createWithdrawalRequest(shop, {
      orderId: body.orderId,
      orderName: body.orderName ?? "",
      customerName: body.customerName ?? "",
      customerEmail: body.customerEmail ?? "",
      countryCode: body.countryCode ?? "",
      shippingAddress: body.shippingAddress ?? "",
      reason: body.reason ?? "",
      orderLineCount: typeof body.orderLineCount === "number" ? body.orderLineCount : null,
      items: body.items,
    });
  } catch (error) {
    if (error instanceof DuplicateWithdrawalRequestError) {
      return cors(
        Response.json(
          {
            error: "A withdrawal request for this order is already being reviewed.",
            code: "duplicate_request",
          },
          { status: 409 },
        ),
      );
    }
    throw error;
  }

  // The submission point in the funnel. Carries sessionId so it links to the
  // button_viewed / form_opened events the extension emitted before a request
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

  return cors(
    Response.json({ withdrawalRequest: withAutomation ?? withdrawalRequest }, { status: 201 }),
  );
}

export const loader = ({ request }) => handleRequest(request);
export const action = ({ request }) => handleRequest(request);
