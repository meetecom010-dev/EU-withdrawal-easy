import { authenticate } from "../shopify.server";
import connectDB from "../db.server";
import WithdrawalRequest from "../models/withdrawal-request.server";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Mandatory GDPR webhook: erase one customer's PII. Matches on the customer's
// email and on the orders Shopify flagged for redaction (converted to the
// gid://shopify/Order/... form WithdrawalRequest.orderId is stored in, since
// the payload gives legacy numeric ids) rather than a customerId, since no
// customer id is stored on the request today.
export const action = async ({ request }) => {
  const { payload, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const customerEmail = payload?.customer?.email ?? null;
  const orderGids = (payload?.orders_to_redact ?? []).map(
    (id) => `gid://shopify/Order/${id}`,
  );

  const matchers = [];
  // Case-insensitive: the stored email comes from whatever surface the
  // customer submitted on, so its casing can differ from Shopify's record.
  if (customerEmail) {
    matchers.push({
      customerEmail: { $regex: `^${escapeRegExp(customerEmail)}$`, $options: "i" },
    });
  }
  if (orderGids.length > 0) matchers.push({ orderId: { $in: orderGids } });

  if (matchers.length === 0) {
    return new Response();
  }

  await connectDB();
  const result = await WithdrawalRequest.updateMany(
    { shop, $or: matchers },
    {
      $set: {
        customerName: "",
        customerEmail: "",
        shippingAddress: "",
        // Free text the customer typed, and staff notes written about them —
        // either can hold personal data.
        reason: "",
        notes: [],
      },
    },
  );

  console.log(
    `Redacted ${result.modifiedCount} withdrawal request(s) for ${shop}`,
  );

  return new Response();
};
