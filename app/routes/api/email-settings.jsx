import { authenticate } from "../../shopify.server";
import {
  getOrCreateAppSettings,
  serializeEmailSettings,
  saveEmailSettings,
} from "../../services/app-settings.server";
import { syncStoreContact } from "../../services/shop.server";

// GET /api/email-settings -> current email template configuration
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const doc = await getOrCreateAppSettings(session.shop);
  const emailSettings = serializeEmailSettings(doc);

  // Default the reply-to to the store's Shopify contact email (also persisted on
  // the Shop doc) so the field comes pre-filled. An empty stored value means
  // "use the store email", which the send path already falls back to.
  const contact = await syncStoreContact(admin, session.shop);
  if (!emailSettings.sender.replyTo) {
    emailSettings.sender.replyTo = contact.email ?? "";
  }

  return Response.json({ emailSettings });
};

// PUT/PATCH /api/email-settings -> replace the email template configuration
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  if (request.method === "PUT" || request.method === "PATCH") {
    const body = await request.json();
    try {
      const emailSettings = await saveEmailSettings(session.shop, body);
      return Response.json({ emailSettings });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};
