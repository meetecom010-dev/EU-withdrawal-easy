import { authenticate } from "../shopify.server";
import connectDB from "../db.server";
import WithdrawalRequest from "../models/withdrawal-request.server";
import FormEvent from "../models/form-event.server";

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

  // Every order this customer has a request on, including ones matched only by
  // email — their funnel events are redacted too.
  const matched = await WithdrawalRequest.find({ shop, $or: matchers }).select("_id orderId").lean();
  const orderIds = [...new Set([...orderGids, ...matched.map((doc) => doc.orderId)])];

  // Matched by id from here on: the first update blanks customerEmail, so the
  // email matcher would no longer find the requests it just redacted.
  const matchedIds = matched.map((doc) => doc._id);
  if (matchedIds.length === 0 && orderIds.length === 0) {
    return new Response();
  }

  const result = await WithdrawalRequest.updateMany(
    { shop, _id: { $in: matchedIds } },
    {
      $set: {
        customerName: "",
        customerEmail: "",
        shippingAddress: "",
        // Free text the customer typed, and staff notes written about them —
        // either can hold personal data.
        reason: "",
        notes: [],
        // Email provider errors can quote the recipient's address.
        "automation.emails.customer.error": null,
        "automation.emails.merchant.error": null,
      },
    },
  );

  // Activity entries keep what happened, but drop the attached detail (error
  // text, provider responses) that could name the customer. Entries that quote
  // an error keep their wording with the error itself blanked, so the admin
  // still reads "Email failed" rather than showing a placeholder.
  await WithdrawalRequest.updateMany(
    { shop, _id: { $in: matchedIds }, "automation.log.0": { $exists: true } },
    { $set: { "automation.log.$[].data": null } },
  );
  await WithdrawalRequest.updateMany(
    { shop, _id: { $in: matchedIds }, "automation.log.messageValues.error": { $exists: true } },
    {
      $set: {
        "automation.log.$[withError].messageValues.error": "—",
        "automation.log.$[withError].message": "",
      },
    },
    { arrayFilters: [{ "withError.messageValues.error": { $exists: true } }] },
  );

  // The support-facing event log for the same orders.
  if (orderIds.length > 0) {
    await FormEvent.updateMany(
      { shop, orderId: { $in: orderIds } },
      {
        $set: {
          log: [],
          sessionId: null,
          "events.customerEmail.error": null,
          "events.merchantEmail.error": null,
        },
      },
    );
  }

  console.log(
    `Redacted ${result.modifiedCount} withdrawal request(s) for ${shop}`,
  );

  return new Response();
};
