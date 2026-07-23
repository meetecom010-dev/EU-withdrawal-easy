import { sendTransactionalEmail } from "./brevo.server";
import { buildMerchantNotificationEmail } from "./templates/merchant-notification.server";
import { buildEmailVariables } from "./variables.server";

// Sends the merchant their notification. Same contract as the customer sender:
// never throws, `sent: false` + null error means skipped, non-null error means
// a real Brevo failure worth logging.
//
// @returns {Promise<{ sent: boolean, messageId: string | null, error: string | null }>}
export async function sendMerchantEmail(request, context = {}) {
  if (!context.merchantEmail) {
    return { sent: false, messageId: null, error: null };
  }

  const vars = buildEmailVariables(request, context);
  const { subject, html } = buildMerchantNotificationEmail(vars);

  try {
    const { messageId } = await sendTransactionalEmail({
      to: { email: context.merchantEmail, name: context.shopName || undefined },
      subject,
      htmlContent: html,
      // So the merchant can reply straight to the customer from the alert.
      replyTo: request.customerEmail
        ? { email: request.customerEmail, name: request.customerName }
        : undefined,
      tags: ["withdrawal", "merchant-notification"],
    });
    return { sent: true, messageId, error: null };
  } catch (error) {
    if (error.code === "not_configured" || error.code === "no_recipient") {
      return { sent: false, messageId: null, error: null };
    }
    return { sent: false, messageId: null, error: error.message };
  }
}
