import { authenticate } from "../../shopify.server";
import { submitWithdrawalRequestFlow } from "../../services/withdrawal-submission.server";
import { hitAll, LIMITS, rateLimitedBody } from "../../services/rate-limit.server";

// POST /api/public-withdrawal-requests -> records a withdrawal request
// submitted from the order-status extension (extensions/withdrawal-order-status),
// then runs the merchant's configured automation against the Shopify order.
// Verified via the extension's session token, same as
// app/routes/api/public-form-settings.jsx — see that file for why `dest`
// is read as a bare domain instead of parsed with `new URL()`.
//
// The session token only proves the caller is a customer of this shop. The
// order itself is proven by its confirmation number, which the submission
// flow checks against Shopify (services/withdrawal-submission.server.js) —
// the same gate public-order-details and public-withdrawal-eligibility use.
async function handleRequest(request) {
  const { sessionToken, cors } = await authenticate.public.customerAccount(request);
  const shop = sessionToken.dest.replace(/^https?:\/\//, "");

  if (request.method !== "POST") {
    return cors(Response.json({ error: "Method not allowed" }, { status: 405 }));
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return cors(Response.json({ error: "Invalid request body", code: "bad_request" }, { status: 400 }));
  }

  const allowed = hitAll([
    { key: `submit:order:${shop}:${String(body.orderId ?? "")}`, ...LIMITS.submitPerOrder },
    { key: `submit:customer:${shop}:${sessionToken.sub ?? ""}`, ...LIMITS.submitPerOrder },
  ]);
  if (!allowed) {
    return cors(Response.json(rateLimitedBody(), { status: 429 }));
  }

  const { status, body: responseBody } = await submitWithdrawalRequestFlow(shop, body);
  return cors(Response.json(responseBody, { status }));
}

export const loader = ({ request }) => handleRequest(request);
export const action = ({ request }) => handleRequest(request);
