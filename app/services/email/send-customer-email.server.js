import { sendTransactionalEmail } from "./brevo.server";
import { renderEmailTemplate } from "./render";
import { buildEmailVariables } from "./variables.server";
import { EMAIL_TEMPLATES, resolveTemplate, pickTemplateForLocale } from "./registry";

// Sends a pre-rendered email to the customer — subject and HTML supplied by the
// caller rather than resolved from a template. Used by the decision flow, where
// staff review (and may edit) the exact approved/rejected email before it goes.
// Same dynamic sender identity and skip/failure contract as sendCustomerTemplate.
//
// @returns {Promise<{ sent: boolean, messageId: string | null, error: string | null }>}
export async function sendCustomerRawEmail(request, { subject, html }, context = {}) {
  if (!request.customerEmail) {
    return { sent: false, messageId: null, error: null };
  }

  const sender = context.emailSettings?.sender ?? {};
  const senderName = sender.fromName || context.shopName || undefined;
  // Send From the merchant's own address only once Brevo has verified it.
  const senderEmail =
    sender.fromEmailStatus === "verified" && sender.fromEmail ? sender.fromEmail : undefined;
  const replyToEmail = sender.replyTo || context.merchantEmail;

  try {
    const { messageId } = await sendTransactionalEmail({
      to: { email: request.customerEmail, name: request.customerName || undefined },
      subject,
      htmlContent: html,
      senderName,
      senderEmail,
      replyTo: replyToEmail ? { email: replyToEmail, name: senderName } : undefined,
      tags: ["withdrawal", "decision"],
    });
    return { sent: true, messageId, error: null };
  } catch (error) {
    if (error.code === "not_configured" || error.code === "no_recipient") {
      return { sent: false, messageId: null, error: null };
    }
    return { sent: false, messageId: null, error: error.message };
  }
}

// Sends any customer-facing template (confirmation, approved, rejected, …) to
// the customer. Never throws — email is best-effort on top of a saved request,
// so the caller gets a result to record either way. `sent:false` + null error
// is a skip (no recipient, template disabled, or Brevo not configured); a
// non-null error is a real failure.
//
// The sender identity is dynamic: the merchant's From name and reply-to (from
// context.emailSettings.sender) drive the display name and where replies land.
// The From address itself stays the app's verified Brevo sender.
//
// @returns {Promise<{ sent: boolean, messageId: string | null, error: string | null }>}
export async function sendCustomerTemplate(templateKey, request, context = {}) {
  if (!request.customerEmail) {
    return { sent: false, messageId: null, error: null };
  }

  const meta = EMAIL_TEMPLATES[templateKey];
  const template = context.emailSettings?.templates?.[templateKey] ?? resolveTemplate(templateKey, {});
  // Required templates (the legal acknowledgement) always send; the rest respect
  // the merchant's enable toggle.
  if (!meta.required && !template.enabled) {
    return { sent: false, messageId: null, error: null };
  }

  const vars = buildEmailVariables(request, context);
  // Send in the buyer's language when the merchant offers a translation for it,
  // otherwise English. request.locale is the language captured at submission.
  const localized = pickTemplateForLocale(template, request.locale);
  const { subject, html } = renderEmailTemplate(localized, vars);
  const sender = context.emailSettings?.sender ?? {};
  const senderName = sender.fromName || context.shopName || undefined;
  // Send From the merchant's own address only once Brevo has verified it.
  const senderEmail =
    sender.fromEmailStatus === "verified" && sender.fromEmail ? sender.fromEmail : undefined;
  // Replies reach the merchant's chosen address, falling back to the shop
  // contact so a reply never lands on an unmonitored sender address.
  const replyToEmail = sender.replyTo || context.merchantEmail;

  try {
    const { messageId } = await sendTransactionalEmail({
      to: { email: request.customerEmail, name: request.customerName || undefined },
      subject,
      htmlContent: html,
      senderName,
      senderEmail,
      replyTo: replyToEmail ? { email: replyToEmail, name: senderName } : undefined,
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
