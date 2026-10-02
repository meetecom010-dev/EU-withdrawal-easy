import { authenticate } from "../shopify.server";
import { submitWithdrawalRequestFlow } from "../services/withdrawal-submission.server";
import { hitAll, LIMITS, rateLimitedBody } from "../services/rate-limit.server";

// POST /apps/<subpath>/submit -> records a withdrawal request submitted
// from the storefront theme app extension (extensions/withdrawal-theme-block).
// Shares the actual submission logic (ownership check, deadline check, DB
// write, funnel event, automation) with
// app/routes/api/public-withdrawal-requests.jsx via
// services/withdrawal-submission.server.js — this file only handles this
// surface's App Proxy auth and passes the "standalone_page" surface flag.
//
// App Proxy's signature only proves the request came through this shop's
// storefront, not who sent it, so the body must carry the order's contact
// email and order number again. The submission flow checks both against
// Shopify — the same two facts the order-lookup step verified.
async function handleRequest(request) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return Response.json(
      { error: "This store isn't set up for withdrawals yet.", code: "store_unavailable" },
      { status: 503 },
    );
  }
  const shop = session.shop;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body", code: "bad_request" }, { status: 400 });
  }

  const allowed = hitAll([
    { key: `submit:order:${shop}:${String(body.orderId ?? "")}`, ...LIMITS.submitPerOrder },
  ]);
  if (!allowed) {
    return Response.json(rateLimitedBody(), { status: 429 });
  }

  const { status, body: responseBody } = await submitWithdrawalRequestFlow(shop, body, {
    surface: "standalone_page",
  });
  return Response.json(responseBody, { status });
}

export const loader = () => Response.json({ error: "Method not allowed" }, { status: 405 });
export const action = ({ request }) => handleRequest(request);
