import { authenticate } from "../../shopify.server";
import { submitWithdrawalRequestFlow } from "../../services/withdrawal-submission.server";

// POST /api/public-withdrawal-requests -> records a withdrawal request
// submitted from the order-status extension (extensions/withdrawal-order-status),
// then runs the merchant's configured automation against the Shopify order.
// Verified via the extension's session token, same as
// app/routes/api/public-form-settings.jsx — see that file for why `dest`
// is read as a bare domain instead of parsed with `new URL()`.
//
// The actual submission logic (deadline check, DB write, funnel event,
// automation) lives in services/withdrawal-submission.server.js, shared with
// the storefront theme app extension's proxy.withdrawly.submit route — this
// file only handles this surface's auth and the order-status surface flag.
async function handleRequest(request) {
  const { sessionToken, cors } = await authenticate.public.customerAccount(request);
  const shop = sessionToken.dest.replace(/^https?:\/\//, "");

  if (request.method !== "POST") {
    return cors(Response.json({ error: "Method not allowed" }, { status: 405 }));
  }

  const body = await request.json();
  const { status, body: responseBody } = await submitWithdrawalRequestFlow(shop, body);
  return cors(Response.json(responseBody, { status }));
}

export const loader = ({ request }) => handleRequest(request);
export const action = ({ request }) => handleRequest(request);
