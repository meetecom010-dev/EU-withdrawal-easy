import { authenticate } from "../../shopify.server";
import { createWithdrawalRequest } from "../../services/withdrawal-request.server";

// POST /api/public-withdrawal-requests -> records a withdrawal request
// submitted from the order-status extension (extensions/order-status-hello).
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

  const withdrawalRequest = await createWithdrawalRequest(shop, {
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

  return cors(Response.json({ withdrawalRequest }, { status: 201 }));
}

export const loader = ({ request }) => handleRequest(request);
export const action = ({ request }) => handleRequest(request);
