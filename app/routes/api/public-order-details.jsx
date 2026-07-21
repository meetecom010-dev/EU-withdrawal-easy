import { authenticate, unauthenticated } from "../../shopify.server";

const ORDER_CUSTOMER_QUERY = `#graphql
  query OrderCustomerDetails($id: ID!) {
    order(id: $id) {
      confirmationNumber
      email
      customer {
        displayName
      }
      shippingAddress {
        name
      }
    }
  }
`;

// GET /api/public-order-details?orderId=...&confirmationNumber=... -> the
// customer name and email for one order, used by the order-status extension
// to prefill the withdrawal form's locked fields. The extension can't read
// these client-side unless the app has protected customer data access
// (without it, `shopify.buyerIdentity` doesn't exist at runtime), so the
// backend resolves them through the Admin API instead.
//
// The caller must present the order's confirmation number alongside its id.
// Order ids are guessable; the confirmation number is only shown to the
// buyer, so requiring both keeps a valid session token from being used to
// enumerate other orders' PII.
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
  const response = await admin.graphql(ORDER_CUSTOMER_QUERY, { variables: { id: orderId } });
  const { data } = await response.json();
  const order = data?.order;

  if (!order?.confirmationNumber || order.confirmationNumber !== confirmationNumber) {
    return cors(Response.json({ error: "Order not found" }, { status: 404 }));
  }

  return cors(
    Response.json({
      customerName: order.customer?.displayName || order.shippingAddress?.name || "",
      customerEmail: order.email || "",
    }),
  );
}

export const loader = ({ request }) => handleRequest(request);
export const action = ({ request }) => handleRequest(request);
