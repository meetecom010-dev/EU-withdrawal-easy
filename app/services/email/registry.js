// The email template registry — the single source of truth for every
// transactional email the app can send. Each entry carries its display metadata
// and its default subject + HTML/Liquid body. Adding a new email is a one-entry
// change here (plus wiring its trigger); nothing in the model, API, or route
// needs to change, because storage is a sparse per-shop override Map keyed by
// these same template keys.
//
// Pure module (no server-only imports) so the UI, the live preview, and the
// send path all share it. {{ dotted.paths }} are filled by ./variables.js at
// render time; the selected products render via {{ withdrawal.line_items }}.

// Global sender identity shared by every email (like Shopify's shop-level
// notification settings). Blank means "use the app defaults".
export const DEFAULT_EMAIL_SENDER = { fromName: "", replyTo: "" };

// ── Shared HTML building blocks ─────────────────────────────────────────────
// Inlined styles throughout, because email clients strip <style> blocks.

function shell(content) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
  </head>
  <body style="margin:0;padding:0;background:#f6f6f7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e1e3e5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
            <tr>
              <td style="padding:20px 28px;border-bottom:1px solid #e1e3e5">
                <span style="font-size:15px;font-weight:600;color:#202223">{{ shop.name }}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px">
${content}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid #e1e3e5;background:#fafbfb">
                <span style="font-size:12px;color:#6d7175">This email was sent by EU Withdrawly on behalf of {{ shop.name }}.</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const heading = (text) => `                <h1 style="margin:0 0 12px;font-size:20px;color:#202223">${text}</h1>`;
const paragraph = (html) =>
  `                <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#202223">${html}</p>`;
const sectionHeading = (text) =>
  `                <h2 style="margin:20px 0 10px;font-size:15px;color:#202223">${text}</h2>`;
const smallPrint = (html) =>
  `                <p style="margin:0;font-size:13px;line-height:1.5;color:#6d7175">${html}</p>`;

// A tinted callout used to lead each email with its outcome.
const callout = (tone, text) => {
  const colors = {
    success: { bg: "#f1f8f5", border: "#cbe5d8", text: "#0f5132" },
    warning: { bg: "#fff8f1", border: "#f0d9bf", text: "#8a5300" },
  }[tone];
  return `                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${colors.bg};border:1px solid ${colors.border};border-radius:10px">
                  <tr><td style="padding:12px 16px;font-size:14px;color:${colors.text};line-height:1.5">${text}</td></tr>
                </table>`;
};

const detailRow = (label, value) => `                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#6d7175;width:170px;vertical-align:top">${label}</td>
                      <td style="padding:6px 0;font-size:14px;color:#202223;vertical-align:top">${value}</td>
                    </tr>`;
const detailsTable = (rows) =>
  `                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px">
${rows.join("\n")}
                </table>`;

const summaryRow = (label, value) => `                    <tr>
                      <td style="padding:5px 0;font-size:13px;color:#6d7175;width:150px;vertical-align:top">${label}</td>
                      <td style="padding:5px 0;font-size:14px;color:#202223;font-weight:500;vertical-align:top">${value}</td>
                    </tr>`;
const summaryBox = (rows) =>
  `                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #e1e3e5;border-radius:12px;background:#fafbfb">
                  <tr><td style="padding:16px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${rows.join("\n")}
                  </table></td></tr>
                </table>`;

const button = (label, url) =>
  `                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 24px">
                  <tr><td style="border-radius:8px;background:#1a1a1a">
                    <a href="${url}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">${label}</a>
                  </td></tr>
                </table>`;

const LINE_ITEMS = "                {{ withdrawal.line_items }}";

// Customer-facing details block, reused by the customer emails so they stay
// consistent. `reason` is the customer's *own* reason for withdrawing, so it's
// shown on the confirmation/approval but omitted on a rejection (where it would
// read as if it were the reason we declined).
const customerDetails = ({ reason = true } = {}) => {
  const rows = [
    detailRow("Reference number", "{{ withdrawal.request_id }}"),
    detailRow("Order number", "{{ order.name }}"),
    detailRow("Submitted on", "{{ withdrawal.submitted_at }}"),
    detailRow("Status", "{{ request.status }}"),
  ];
  if (reason) rows.push(detailRow("Reason", "{{ withdrawal.reason }}"));
  return detailsTable(rows);
};

const contactLine = () =>
  paragraph(
    "Questions about your request? Contact {{ shop.name }} at <a href=\"mailto:{{ shop.email }}\" style=\"color:#2c6ecb\">{{ shop.email }}</a>, or simply reply to this email.",
  );

// ── The registry ────────────────────────────────────────────────────────────

export const EMAIL_TEMPLATES = {
  customerConfirmation: {
    key: "customerConfirmation",
    name: "Customer withdrawal confirmation",
    description: "Sent to the customer the moment they submit a withdrawal request.",
    audience: "Customer",
    required: true, // legal acknowledgement — always sent
    defaults: {
      subject: "We've received your withdrawal request — order {{ order.name }}",
      bodyHtml: shell(
        [
          heading("Your withdrawal request has been received"),
          callout("success", "Thanks — your withdrawal request has been received and is now being reviewed."),
          paragraph(
            "Hi {{ customer.first_name }}, thank you for contacting {{ shop.name }}. This email confirms that we've received your withdrawal request. You have the right to withdraw from your purchase under EU consumer law, and we'll process your request as quickly as possible.",
          ),
          customerDetails(),
          sectionHeading("Items you're withdrawing"),
          LINE_ITEMS,
          sectionHeading("What happens next"),
          `                <ol style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.7;color:#202223">
                  <li>Our team will review your request.</li>
                  <li>We'll email you the next steps, including return instructions if any items need to be sent back.</li>
                  <li>Any refund you're due will be issued in line with EU consumer law once your withdrawal is processed.</li>
                </ol>`,
          contactLine(),
          smallPrint("If you didn't make this request, or anything looks wrong, please let us know straight away."),
        ].join("\n"),
      ),
    },
  },

  merchantNotification: {
    key: "merchantNotification",
    name: "New request notification",
    description: "Alerts you by email whenever a new withdrawal request comes in.",
    audience: "You",
    required: false,
    defaults: {
      subject: "New withdrawal request — order {{ order.name }}",
      bodyHtml: shell(
        [
          heading("New withdrawal request"),
          paragraph("A customer has submitted a withdrawal request. Here's everything you need to review it."),
          summaryBox([
            summaryRow("Name", "{{ customer.first_name }} {{ customer.last_name }}"),
            summaryRow("Email", "<a href=\"mailto:{{ customer.email }}\" style=\"color:#2c6ecb\">{{ customer.email }}</a>"),
            summaryRow("Date", "{{ withdrawal.submitted_at }}"),
            summaryRow("Order number", "{{ order.name }}"),
            summaryRow("Reference number", "{{ withdrawal.request_id }}"),
            summaryRow("Reason", "{{ withdrawal.reason }}"),
          ]),
          button("View request", "{{ request.url }}"),
          sectionHeading("Items requested"),
          LINE_ITEMS,
          smallPrint(
            "Open the request in your admin to approve or reject it. Refund and return deadlines are tracked there automatically.",
          ),
        ].join("\n"),
      ),
    },
  },

  withdrawalApproved: {
    key: "withdrawalApproved",
    name: "Withdrawal approved",
    description: "Sent to the customer when you approve their withdrawal request.",
    audience: "Customer",
    required: false,
    defaults: {
      subject: "Your withdrawal request for order {{ order.name }} has been approved",
      bodyHtml: shell(
        [
          heading("Your withdrawal request has been approved"),
          callout("success", "Good news — your withdrawal request has been approved."),
          paragraph(
            "Hi {{ customer.first_name }}, we've reviewed your request and approved your withdrawal from order {{ order.name }}. Here's what this means and what happens next.",
          ),
          customerDetails(),
          sectionHeading("Approved items"),
          LINE_ITEMS,
          sectionHeading("Your refund"),
          paragraph(
            "We'll refund your payment to your original payment method within 14 days, as required by EU consumer law. Where you've withdrawn from your whole order, this includes the standard delivery cost.",
          ),
          sectionHeading("Returning your items"),
          paragraph(
            "If your order has already been delivered, please keep the items in their original condition. We'll send you separate return instructions — including the return address and who covers return shipping — and ask that you send the items back within 14 days. Your refund is completed once we've received the items back, or you've provided proof that you've returned them.",
          ),
          contactLine(),
        ].join("\n"),
      ),
    },
  },

  withdrawalRejected: {
    key: "withdrawalRejected",
    name: "Withdrawal rejected",
    description: "Sent to the customer when you reject their withdrawal request.",
    audience: "Customer",
    required: false,
    defaults: {
      subject: "Update on your withdrawal request for order {{ order.name }}",
      bodyHtml: shell(
        [
          heading("Update on your withdrawal request"),
          callout("warning", "After reviewing your request, we're unable to approve this withdrawal."),
          paragraph(
            "Hi {{ customer.first_name }}, thank you for contacting {{ shop.name }}. We've carefully reviewed your withdrawal request for order {{ order.name }}, and unfortunately we're unable to approve it on this occasion.",
          ),
          customerDetails({ reason: false }),
          paragraph(
            "This can happen when a request falls outside the statutory 14-day withdrawal period, or when the items are exempt from the right of withdrawal — for example personalised or made-to-order goods, sealed health or hygiene products that have been unsealed, or perishable items.",
          ),
          sectionHeading("Items in this request"),
          LINE_ITEMS,
          paragraph(
            "If you'd like more detail on the reason for this decision, or you believe it may be a mistake, please get in touch — we'll be glad to help. This decision doesn't affect your statutory consumer rights.",
          ),
          contactLine(),
        ].join("\n"),
      ),
    },
  },
};

// The template keys, in display order.
export const TEMPLATE_KEYS = Object.keys(EMAIL_TEMPLATES);

// Metadata list for the UI (no bodies).
export const TEMPLATE_LIST = TEMPLATE_KEYS.map((key) => {
  const { name, description, audience, required } = EMAIL_TEMPLATES[key];
  return { key, name, description, audience, required };
});

// The effective template for a shop = its defaults with the shop's sparse
// override merged on top. `enabled` defaults to true, and required templates
// can never be disabled.
export function resolveTemplate(key, override = {}) {
  const template = EMAIL_TEMPLATES[key];
  return {
    enabled: template.required ? true : override.enabled ?? true,
    subject: override.subject ?? template.defaults.subject,
    bodyHtml: override.bodyHtml ?? template.defaults.bodyHtml,
  };
}

// The clean default (no override) — used by the route's "Reset to default".
export function templateDefault(key) {
  return resolveTemplate(key, {});
}

// Reduces a full effective template down to only the fields that differ from
// the code default. Storing just the diff means an unedited template stays on
// the current default (and benefits from future improvements), and "reset"
// simply produces an empty diff so the override is dropped.
export function diffOverride(key, effective = {}) {
  const template = EMAIL_TEMPLATES[key];
  const override = {};
  if (!template.required && effective.enabled === false) override.enabled = false;
  if (effective.subject != null && effective.subject !== template.defaults.subject) {
    override.subject = effective.subject;
  }
  if (effective.bodyHtml != null && effective.bodyHtml !== template.defaults.bodyHtml) {
    override.bodyHtml = effective.bodyHtml;
  }
  return override;
}
