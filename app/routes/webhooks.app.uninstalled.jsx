import { authenticate } from "../shopify.server";
import connectDB from "../db.server";
import Session from "../models/session.server";
import { markShopUninstalled } from "../services/shop.server";
import { alertError } from "../services/slack/alert-error.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    // Webhook requests can trigger multiple times and after an app has already been uninstalled.
    // If this webhook already ran, the session may have been deleted previously.
    if (session) {
      await connectDB();
      await Session.deleteMany({ shop });
      await markShopUninstalled(shop);
    }
  } catch (error) {
    await alertError({ context: `webhook:${topic}`, error, shop });
    throw error;
  }

  return new Response();
};
