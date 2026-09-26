import { authenticate } from "../shopify.server";
import { findOrderForWithdrawalLookup } from "../services/shopify/orders.server";
import { resolveWithdrawalEligibility } from "../services/withdrawal-eligibility.server";

const GENERIC_NOT_FOUND = {
  error: "We couldn't find an order matching those details.",
  code: "order_not_found",
};

// POST /apps/<subpath>/order-lookup -> looks up an order by order number +
// email (the only identifying facts a storefront visitor has, with no
// session token or confirmation number available the way the order-status
// extension has) and, if it matches, returns the order's eligible line items
// plus the withdrawal-eligibility verdict in one response — the theme
// block's single-page flow doesn't split this into separate calls the way
// the checkout extension does.
async function handleRequest(request) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { session, admin } = await authenticate.public.appProxy(request);
  if (!session || !admin) {
    return Response.json({ error: "This store isn't set up for withdrawals yet." }, { status: 503 });
  }
  const shop = session.shop;

  const body = await request.json().catch(() => null);
  const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber : "";
  const email = typeof body?.email === "string" ? body.email : "";
  if (!orderNumber.trim() || !email.trim()) {
    return Response.json({ error: "Email and order number are required." }, { status: 400 });
  }

  const order = await findOrderForWithdrawalLookup(admin, { orderName: orderNumber, email });
  if (!order) {
    return Response.json(GENERIC_NOT_FOUND, { status: 404 });
  }

  if (order.cancelledAt) {
    return Response.json(
      { error: "This order has been cancelled, so there's nothing to withdraw from.", code: "order_cancelled" },
      { status: 422 },
    );
  }

  const eligibility = await resolveWithdrawalEligibility(shop, order.id, { surface: "standalone_page" });
  if (!eligibility.isEligible) {
    return Response.json(
      { error: eligibility.message || "This order is no longer eligible for withdrawal.", code: eligibility.code },
      { status: 422 },
    );
  }

  return Response.json({
    order: {
      id: order.id,
      name: order.name,
      email: order.email,
      shippingAddress: order.shippingAddress,
    },
    stage: eligibility.stage,
    daysRemaining: eligibility.window?.daysRemaining ?? null,
    items: order.lineItems,
  });
}

export const loader = () => Response.json({ error: "Method not allowed" }, { status: 405 });
export const action = ({ request }) => handleRequest(request);
