import { authenticate } from "../shopify.server";
import connectDB from "../db.server";
import Session from "../models/session.server";

// Keeps the stored session's scope in step with what the merchant actually
// granted, so the library's scope check doesn't keep asking for scopes the
// shop already has (or has just dropped).
export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload?.current;

  if (session && Array.isArray(current)) {
    await connectDB();
    await Session.updateOne({ _id: session.id }, { $set: { scope: current.toString() } });
  }

  return new Response();
};
