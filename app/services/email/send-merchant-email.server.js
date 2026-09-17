import { sendTransactionalEmail } from "./brevo.server";
import { renderEmailTemplate } from "./render";
import { buildEmailVariables } from "./variables.server";
import { EMAIL_TEMPLATES, resolveTemplate } from "./registry";

// Sends any merchant-facing template (the new-request notification, and future
// merchant alerts) to the shop's contact address. Same contract as the customer
// sender: never throws, `sent:false` + null error means skipped.
//
// Reply-to points at the customer so the merchant can reply straight from the
// alert; the From name still honours the merchant's configured sender name.
//
// @returns {Promise<{ sent: boolean, messageId: string | null, error: string | null }>}
export async function sendMerchantTemplate(templateKey, request, context = {}) {
  if (!context.merchantEmail) {
    return { sent: false, messageId: null, error: null };
  }

  const meta = EMAIL_TEMPLATES[templateKey];
  const template = context.emailSettings?.templates?.[templateKey] ?? resolveTemplate(templateKey, {});
  if (!meta.required && !template.enabled) {
    return { sent: false, messageId: null, error: null };
  }

  const vars = buildEmailVariables(request, context);
  const { subject, html } = renderEmailTemplate(template, vars);
  const sender = context.emailSettings?.sender ?? {};
  const senderName = sender.fromName || context.shopName || undefined;
  // Send From the merchant's own address only once Brevo has verified it.
  const senderEmail =
    sender.fromEmailStatus === "verified" && sender.fromEmail ? sender.fromEmail : undefined;

  try {
    const { messageId } = await sendTransactionalEmail({
      to: { email: context.merchantEmail, name: context.shopName || undefined },
      subject,
      htmlContent: html,
      senderName,
      senderEmail,
      replyTo: request.customerEmail
        ? { email: request.customerEmail, name: request.customerName }
        : undefined,
      tags: ["withdrawal", templateKey],
    });
    return { sent: true, messageId, error: null };
  } catch (error) {
    if (error.code === "not_configured" || error.code === "no_recipient") {
      return { sent: false, messageId: null, error: null };
    }
    return { sent: false, messageId: null, error: error.message };
  }
}
