import { authenticate } from "../shopify.server";
import { submitWithdrawalRequestFlow } from "../services/withdrawal-submission.server";

// POST /apps/withdrawl-easy/submit -> records a withdrawal request submitted
// from the storefront theme app extension (extensions/withdrawal-theme-block).
// Shares the actual submission logic (deadline check, DB write, funnel
// event, automation) with app/routes/api/public-withdrawal-requests.jsx via
// services/withdrawal-submission.server.js — this file only handles this
// surface's App Proxy auth and passes the "standalone_page" surface flag.
async function handleRequest(request) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return Response.json({ error: "This store isn't set up for withdrawals yet." }, { status: 503 });
  }
  const shop = session.shop;

  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { status, body: responseBody } = await submitWithdrawalRequestFlow(shop, body, {
    surface: "standalone_page",
  });
  return Response.json(responseBody, { status });
}

export const loader = () => Response.json({ error: "Method not allowed" }, { status: 405 });
export const action = ({ request }) => handleRequest(request);
