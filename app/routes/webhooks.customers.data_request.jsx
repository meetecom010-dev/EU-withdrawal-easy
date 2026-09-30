import { authenticate } from "../shopify.server";
import connectDB from "../db.server";
import WithdrawalRequest from "../models/withdrawal-request.server";
import { postMessage } from "../services/slack/slack.server";

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

  await connectDB();
  const matches = customerEmail
    ? await WithdrawalRequest.countDocuments({ shop, customerEmail })
    : 0;

  await postMessage({
    text: [
      `:incoming_envelope: *GDPR data request* — \`${shop}\``,
      `data_request.id: ${dataRequestId}`,
      `customer: ${customerEmail ?? "(no email)"} (id: ${customerId})`,
      `withdrawal requests on file: ${matches}`,
      "This needs a manual response to the merchant within the legal deadline.",
    ].join("\n"),
  });

  return new Response();
};
