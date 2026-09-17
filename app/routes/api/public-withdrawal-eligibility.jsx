import { authenticate, unauthenticated } from "../../shopify.server";
import { resolveWithdrawalEligibility } from "../../services/withdrawal-eligibility.server";

const ORDER_CONFIRMATION_QUERY = `#graphql
  query OrderConfirmationCheck($id: ID!) {
    order(id: $id) {
      confirmationNumber
    }
  }
`;

// GET /api/public-withdrawal-eligibility?orderId=...&confirmationNumber=...
// -> whether this order can still be withdrawn from, and the message to show
// when it can't.
//
// Gated on the confirmation number for the same reason as
// app/routes/api/public-order-details.jsx: order ids are guessable, the
// confirmation number is only shown to the buyer, so requiring both stops a
// valid session token being used to probe other people's orders — here it
// would leak delivery dates.
async function handleRequest(request) {
  const { sessionToken, cors } = await authenticate.public.customerAccount(request);
  const shop = sessionToken.dest.replace(/^https?:\/\//, "");

  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  const confirmationNumber = url.searchParams.get("confirmationNumber");
  if (!orderId || !confirmationNumber) {
    return cors(
      Response.json({ error: "orderId and confirmationNumber are required" }, { status: 400 }),
    );
  }

  const { admin } = await unauthenticated.admin(shop);
  const response = await admin.graphql(ORDER_CONFIRMATION_QUERY, { variables: { id: orderId } });
  const { data } = await response.json();

  if (!data?.order?.confirmationNumber || data.order.confirmationNumber !== confirmationNumber) {
    return cors(Response.json({ error: "Order not found" }, { status: 404 }));
  }

  const eligibility = await resolveWithdrawalEligibility(shop, orderId);

  return cors(
    Response.json(
      {
        isEligible: eligibility.isEligible,
        code: eligibility.code,
        message: eligibility.message,
        // "before_delivery" | "delivered" — which set of merchant copy the
        // extension should render.
        stage: eligibility.stage,
        // Only the closing date is exposed, never the merchant's transit-day or
        // day-count settings.
        expiresAt: eligibility.window?.expiresAt ?? null,
        daysRemaining: eligibility.window?.daysRemaining ?? null,
      },
      {
        // This answer changes as the order moves through its lifecycle. A
        // cached copy is exactly the bug this endpoint exists to fix — a
        // customer would keep seeing the pre-delivery copy after their parcel
        // arrived.
        headers: { "Cache-Control": "no-store" },
      },
    ),
  );
}

export const loader = ({ request }) => handleRequest(request);
export const action = ({ request }) => handleRequest(request);
