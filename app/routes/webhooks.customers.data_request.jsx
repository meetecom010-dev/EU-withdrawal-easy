import { authenticate } from "../shopify.server";
import connectDB from "../db.server";
import WithdrawalRequest from "../models/withdrawal-request.server";
import { postMessage } from "../services/slack/slack.server";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Mandatory GDPR webhook: a customer (or Shopify, on their behalf) asked to
// see what data this app holds on them. Shopify only requires a 200 here —
// actually compiling and sending the data back to the merchant/customer is a
// manual step with a legal deadline, so this just surfaces the request to
// staff via Slack rather than trying to auto-export anything.
export const action = async ({ request }) => {
  const { payload, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const customerEmail = payload?.customer?.email ?? null;
  const customerId = payload?.customer?.id ?? null;
  const dataRequestId = payload?.data_request?.id ?? null;
  // Same matching as customers/redact: by email, and by the orders Shopify
  // lists, so a request stored with a different (or no) email still counts.
  const orderGids = (payload?.orders_requested ?? []).map(
    (id) => `gid://shopify/Order/${id}`,
  );

  const matchers = [];
  if (customerEmail) {
    matchers.push({
      customerEmail: { $regex: `^${escapeRegExp(customerEmail)}$`, $options: "i" },
    });
  }
  if (orderGids.length > 0) matchers.push({ orderId: { $in: orderGids } });

  await connectDB();
  const matches =
    matchers.length > 0
      ? await WithdrawalRequest.countDocuments({ shop, $or: matchers })
      : 0;

  const text = [
    `:incoming_envelope: *GDPR data request* — \`${shop}\``,
    `data_request.id: ${dataRequestId}`,
    `customer: ${customerEmail ?? "(no email)"} (id: ${customerId})`,
    `orders requested: ${orderGids.length > 0 ? orderGids.join(", ") : "(none)"}`,
    `withdrawal requests on file: ${matches}`,
    "This needs a manual response to the merchant within the legal deadline.",
  ].join("\n");

  // postMessage never throws, so check the result: if Slack is down or not
  // configured, the server log is the only record this request arrived.
  const { sent, error } = await postMessage({ text });
  if (!sent) {
    console.error(`GDPR data request not posted to Slack (${error}):\n${text}`);
  }

  return new Response();
};
