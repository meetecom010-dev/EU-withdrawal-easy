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
//
// The three customer emails are generated from ./email-strings.js — one builder
// per template, run through every language's strings — so the English default
// and every translation share a single structure and only the words differ.

import { EMAIL_STRINGS, EMAIL_STRING_LOCALES } from "./email-strings";

// English is the base language every email falls back to.
export const BASE_EMAIL_LOCALE = "en";

// Global sender identity shared by every email (like Shopify's shop-level
// notification settings). Blank means "use the app defaults".
export const DEFAULT_EMAIL_SENDER = { fromName: "", replyTo: "" };

// ── Shared HTML building blocks ─────────────────────────────────────────────
// Inlined styles throughout, because email clients strip <style> blocks.

function shell(content, footer = EMAIL_STRINGS.en.footer) {
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
                <span style="font-size:12px;color:#6d7175">${footer}</span>
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

const orderedList = (items) =>
  `                <ol style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.7;color:#202223">
${items.map((li) => `                  <li>${li}</li>`).join("\n")}
                </ol>`;

// Customer-facing details block, reused by the customer emails so they stay
// consistent. `reason` is the customer's *own* reason for withdrawing, so it's
// shown on the confirmation/approval but omitted on a rejection (where it would
// read as if it were the reason we declined). Row labels come from the language
// strings so the whole table translates.
const customerDetails = (labels, { reason = true } = {}) => {
  const rows = [
    detailRow(labels.referenceNumber, "{{ withdrawal.request_id }}"),
    detailRow(labels.orderNumber, "{{ order.name }}"),
    detailRow(labels.submittedOn, "{{ withdrawal.submitted_at }}"),
    detailRow(labels.status, "{{ request.status }}"),
  ];
  if (reason) rows.push(detailRow(labels.reason, "{{ withdrawal.reason }}"));
  return detailsTable(rows);
};

const contactLine = (text) => paragraph(text);

// ── Customer email builders ─────────────────────────────────────────────────
// Each takes one language's strings (email-strings.js) and returns the body
// HTML. Run once per language to produce the default + every translation.

function confirmationBody(s) {
  return shell(
    [
      heading(s.confirmation.heading),
      callout("success", s.confirmation.callout),
      paragraph(s.confirmation.intro),
      customerDetails(s.labels),
      sectionHeading(s.confirmation.itemsHeading),
      LINE_ITEMS,
      sectionHeading(s.confirmation.nextHeading),
      orderedList(s.confirmation.nextSteps),
      contactLine(s.contact),
      smallPrint(s.confirmation.smallPrint),
    ].join("\n"),
    s.footer,
  );
}

function approvedBody(s) {
  return shell(
    [
      heading(s.approved.heading),
      callout("success", s.approved.callout),
      paragraph(s.approved.intro),
      customerDetails(s.labels),
      sectionHeading(s.approved.itemsHeading),
      LINE_ITEMS,
      sectionHeading(s.approved.refundHeading),
      paragraph(s.approved.refund),
      sectionHeading(s.approved.returnHeading),
      paragraph(s.approved.returnText),
      contactLine(s.contact),
    ].join("\n"),
    s.footer,
  );
}

function rejectedBody(s) {
  return shell(
    [
      heading(s.rejected.heading),
      callout("warning", s.rejected.callout),
      paragraph(s.rejected.intro),
      customerDetails(s.labels, { reason: false }),
      paragraph(s.rejected.exemptions),
      sectionHeading(s.rejected.itemsHeading),
      LINE_ITEMS,
      paragraph(s.rejected.appeal),
      contactLine(s.contact),
    ].join("\n"),
    s.footer,
  );
}

// Builds a customer template's defaults (English) plus a translation per
// language, all from the same builder + strings so they can never structurally
// drift.
function customerTemplate({ key, name, description, required, section, build }) {
  const forLocale = (locale) => {
    const s = EMAIL_STRINGS[locale];
    return { subject: s[section].subject, bodyHtml: build(s) };
  };
  const translations = {};
  for (const locale of EMAIL_STRING_LOCALES) translations[locale] = forLocale(locale);
  return {
    key,
    name,
    description,
    audience: "Customer",
    required,
    defaults: forLocale(BASE_EMAIL_LOCALE),
    translations,
  };
}

// ── The registry ────────────────────────────────────────────────────────────

export const EMAIL_TEMPLATES = {
  customerConfirmation: customerTemplate({
    key: "customerConfirmation",
    name: "Customer withdrawal confirmation",
    description: "Sent to the customer the moment they submit a withdrawal request.",
    required: true, // legal acknowledgement — always sent
    section: "confirmation",
    build: confirmationBody,
  }),

  merchantNotification: {
    key: "merchantNotification",
    name: "New request notification",
    description: "Alerts you by email whenever a new withdrawal request comes in.",
    audience: "You",
    required: false,
    // Sent to the merchant, not the buyer, so it stays in one language (no
    // translations map — the send path falls back to these defaults).
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

  withdrawalApproved: customerTemplate({
    key: "withdrawalApproved",
    name: "Withdrawal approved",
    description: "Sent to the customer when you approve their withdrawal request.",
    required: false,
    section: "approved",
    build: approvedBody,
  }),

  withdrawalRejected: customerTemplate({
    key: "withdrawalRejected",
    name: "Withdrawal rejected",
    description: "Sent to the customer when you reject their withdrawal request.",
    required: false,
    section: "rejected",
    build: rejectedBody,
  }),
};

// The template keys, in display order.
export const TEMPLATE_KEYS = Object.keys(EMAIL_TEMPLATES);

// Metadata list for the UI (no bodies).
export const TEMPLATE_LIST = TEMPLATE_KEYS.map((key) => {
  const { name, description, audience, required } = EMAIL_TEMPLATES[key];
  return { key, name, description, audience, required };
});

// "de-DE" / "de_DE" -> "de". Buyer locales arrive region-tagged.
export function normalizeEmailLocale(locale) {
  return String(locale ?? "").toLowerCase().split(/[-_]/)[0];
}

// Picks the subject/body for a buyer's locale out of a *serialized* email
// template (serializeEmailSettings output: base copy + a `translations` map).
// Falls back to the base (English) copy when there's no translation for that
// locale — which is also how an unsupported language and the merchant
// notification resolve.
export function pickTemplateForLocale(template, locale) {
  const lang = normalizeEmailLocale(locale);
  const translated = lang && lang !== BASE_EMAIL_LOCALE ? template.translations?.[lang] : null;
  return {
    subject: translated?.subject ?? template.subject,
    bodyHtml: translated?.bodyHtml ?? template.bodyHtml,
  };
}

// The registry default subject/body for one locale. English uses `defaults`;
// any other language uses its translation, falling back to English when the
// template has no translation for it (e.g. the merchant notification, or an
// unsupported locale).
export function localeDefault(key, locale = BASE_EMAIL_LOCALE) {
  const template = EMAIL_TEMPLATES[key];
  if (locale === BASE_EMAIL_LOCALE) return template.defaults;
  return template.translations?.[locale] ?? template.defaults;
}

// True when the template has a real translation for this locale (so the editor
// knows which language tabs to offer per template).
export function hasTranslation(key, locale) {
  return Boolean(EMAIL_TEMPLATES[key].translations?.[locale]);
}

// The per-locale slice of a stored override. English lives at the top level of
// the override; other languages under override.translations[locale].
function overrideForLocale(override = {}, locale) {
  if (locale === BASE_EMAIL_LOCALE) {
    return { subject: override.subject, bodyHtml: override.bodyHtml };
  }
  return override.translations?.[locale] ?? {};
}

// The effective template for a shop in a given language = that locale's default
// with the shop's sparse override merged on top. `enabled` is shop-wide (not
// per-locale); required templates can never be disabled.
export function resolveTemplate(key, override = {}, locale = BASE_EMAIL_LOCALE) {
  const template = EMAIL_TEMPLATES[key];
  const base = localeDefault(key, locale);
  const ov = overrideForLocale(override, locale);
  return {
    enabled: template.required ? true : override.enabled ?? true,
    subject: ov.subject ?? base.subject,
    bodyHtml: ov.bodyHtml ?? base.bodyHtml,
  };
}

// The clean default (no override) for a locale — used by the route's "Reset to
// default" and by the editor to seed a language tab.
export function templateDefault(key, locale = BASE_EMAIL_LOCALE) {
  return resolveTemplate(key, {}, locale);
}

// Reduces a full effective template (English base + per-locale translations)
// down to only what differs from the code defaults. Storing just the diff means
// an unedited template/locale stays on the current default (and benefits from
// future improvements), and "reset" produces an empty diff so the override is
// dropped.
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

  const translations = {};
  for (const [locale, copy] of Object.entries(effective.translations ?? {})) {
    const def = template.translations?.[locale];
    if (!def || !copy) continue;
    const diff = {};
    if (copy.subject != null && copy.subject !== def.subject) diff.subject = copy.subject;
    if (copy.bodyHtml != null && copy.bodyHtml !== def.bodyHtml) diff.bodyHtml = copy.bodyHtml;
    if (Object.keys(diff).length) translations[locale] = diff;
  }
  if (Object.keys(translations).length) override.translations = translations;

  return override;
}
