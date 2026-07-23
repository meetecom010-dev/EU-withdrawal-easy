import { sendTransactionalEmail } from "./brevo.server";
import { buildCustomerConfirmationEmail } from "./templates/customer-confirmation.server";
import { buildEmailVariables } from "./variables.server";

// Sends the customer their confirmation. Never throws — email is best-effort
// on top of a submission that's already saved, so the caller gets a result to
// record either way. A `sent: false` with a null error is a skip (no
// recipient, or Brevo not configured); a non-null error is a real failure.
//
// @returns {Promise<{ sent: boolean, messageId: string | null, error: string | null }>}
export async function sendCustomerEmail(request, context = {}) {
  if (!request.customerEmail) {
    return { sent: false, messageId: null, error: null };
  }

  const vars = buildEmailVariables(request, context);
  const { subject, html } = buildCustomerConfirmationEmail(vars);

  try {
    const { messageId } = await sendTransactionalEmail({
      to: { email: request.customerEmail, name: request.customerName || undefined },
      subject,
      htmlContent: html,
      // Replies reach the merchant, not an unmonitored sender address.
      replyTo: context.merchantEmail ? { email: context.merchantEmail, name: context.shopName } : undefined,
      tags: ["withdrawal", "customer-confirmation"],
    });
    return { sent: true, messageId, error: null };
  } catch (error) {
    // "not_configured" and "no_recipient" are skips, not failures — surfacing
    // them as errors would light up every shop that hasn't set Brevo up.
    if (error.code === "not_configured" || error.code === "no_recipient") {
      return { sent: false, messageId: null, error: null };
    }
    return { sent: false, messageId: null, error: error.message };
  }
}
