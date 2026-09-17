// Canonical catalogue of the Liquid variables merchants can drop into an email
// subject or HTML body, plus the substitution used to fill them in. Pure and
// free of any server-only import so BOTH sides use the exact same list and
// rendering:
//   - the Email Templates UI (grouped variable panel + live preview), and
//   - the server send path (renders the real email).
//
// Variables use dotted Liquid namespaces ({{ customer.first_name }}) to match
// what Shopify merchants already know from theme and notification editing.
// buildLiquidData() below bridges the internal buildEmailVariables() shape
// (./variables.server.js) to the nested object these paths read from.

import { escapeHtml, formatMoney, formatDateTime } from "./format";

// Grouped for the variable panel. `sample` values power the live preview so a
// merchant sees a realistic email; they mirror the prototype's demo store.
export const EMAIL_VARIABLE_GROUPS = [
  {
    category: "Customer",
    variables: [
      { token: "customer.first_name", label: "First name", description: "The customer's first name", sample: "Lena" },
      { token: "customer.last_name", label: "Last name", description: "The customer's last name", sample: "Hoffmann" },
      { token: "customer.email", label: "Email", description: "The customer's email address", sample: "lena.hoffmann@example.com" },
    ],
  },
  {
    category: "Order",
    variables: [
      { token: "order.name", label: "Order number", description: "The order number, e.g. #2138", sample: "#2138" },
      { token: "order.id", label: "Order ID", description: "The order's internal ID", sample: "1234567890" },
    ],
  },
  {
    category: "Withdrawal",
    variables: [
      { token: "withdrawal.request_id", label: "Reference number", description: "The withdrawal request reference", sample: "b5238240-5af0-479f-a16d-b1522cf35458" },
      { token: "withdrawal.submitted_at", label: "Submission date", description: "When the request was submitted, with time", sample: "24 July 2026 at 23:30" },
      { token: "withdrawal.reason", label: "Reason", description: "The reason the customer gave, if any", sample: "Changed my mind" },
      { token: "withdrawal.selected_products", label: "Selected products (text)", description: "The items as a comma-separated list", sample: "Fjord Table Lamp — Oak × 1, Tind Candle Holder × 2" },
    ],
  },
  {
    category: "Request",
    variables: [
      { token: "request.status", label: "Status", description: "The current status of the request", sample: "Pending review" },
      { token: "request.url", label: "View request link", description: "Link to the request in your app admin", sample: "https://admin.shopify.com/…/withdrawal-requests/…" },
    ],
  },
  {
    category: "Shop",
    variables: [
      { token: "shop.name", label: "Shop name", description: "Your store's name", sample: "Nordlys Living" },
      { token: "shop.email", label: "Contact email", description: "Your store's contact email address", sample: "hello@nordlysliving.example" },
    ],
  },
];

// Flat list of every variable shown in the panel, in group order.
export const EMAIL_VARIABLES = EMAIL_VARIABLE_GROUPS.flatMap((group) => group.variables);

// Tokens that render but aren't offered in the panel. The selected products now
// render automatically via the default templates' {{ withdrawal.line_items }}
// block, so merchants don't insert it by hand — but it must stay renderable.
const RENDER_ONLY_TOKENS = [{ token: "withdrawal.line_items", html: true }];

const ALL_TOKENS = [...EMAIL_VARIABLES, ...RENDER_ONLY_TOKENS];

// Fast lookup of every valid dotted path, so a typo like {{ oder.name }} is left
// visible in the output instead of being silently blanked.
const VALID_TOKENS = new Set(ALL_TOKENS.map((v) => v.token));

// Tokens whose value is app-generated, already-escaped HTML (e.g. the line-item
// blocks). These are inserted raw rather than escaped — see applyLiquid.
const HTML_TOKENS = new Set(ALL_TOKENS.filter((v) => v.html).map((v) => v.token));

// A full internal-shape request (the buildEmailVariables output shape) used to
// power the live preview and the "Preview" modal.
export const SAMPLE_REQUEST_VARS = {
  customerName: "Lena Hoffmann",
  customerEmail: "lena.hoffmann@example.com",
  orderNumber: "#2138",
  orderId: "1234567890",
  requestId: "b5238240-5af0-479f-a16d-b1522cf35458",
  submissionDate: "2026-07-24T23:30:00",
  status: "pending",
  reason: "Changed my mind",
  shopName: "Nordlys Living",
  merchantEmail: "hello@nordlysliving.example",
  reviewUrl: "https://admin.shopify.com/apps/eu-withdrawly/withdrawal-requests/b5238240-5af0-479f-a16d-b1522cf35458",
  items: [
    {
      title: "Fjord Table Lamp",
      variantTitle: "Oak / Large",
      sku: "LMP-FJ-OAK",
      quantity: 1,
      price: { amount: "89.00", currencyCode: "EUR" },
      imageUrl:
        "https://cdn.shopify.com/s/files/1/0682/4787/9778/files/AAUvwnj0ICORVuxs41ODOvnhvedArLiSV20df7r8XBjEUQ_s900-c-k-c0x00ffffff-no-rj.jpg",
    },
    {
      title: "Tind Candle Holder",
      variantTitle: "Brass",
      sku: "CND-TND-02",
      quantity: 2,
      price: { amount: "29.45", currencyCode: "EUR" },
      imageUrl:
        "https://cdn.shopify.com/s/files/1/0682/4787/9778/files/AAUvwnj0ICORVuxs41ODOvnhvedArLiSV20df7r8XBjEUQ_s900-c-k-c0x00ffffff-no-rj.jpg",
    },
  ],
};

// Renders the withdrawn items as email-safe blocks, one card per product,
// mirroring the withdrawal form's line-item layout: a thumbnail (or a
// placeholder when the order line has no image), the product title with the
// variant title beneath it, and the line price pinned to the right. Text parts
// are escaped; the surrounding markup is app-generated and safe, so applyLiquid
// inserts the result raw (see HTML_TOKENS).
// App-generated bits of the email that aren't part of the merchant's editable
// body — the line-item card's "Qty" / empty-state text and the status label —
// translated so the whole email reads in one language. Keyed by language code;
// unknown locales fall back to English.
const LINE_ITEM_STRINGS = {
  en: { qty: "Qty", none: "No items listed." },
  de: { qty: "Menge", none: "Keine Artikel aufgeführt." },
  fr: { qty: "Qté", none: "Aucun article répertorié." },
  nl: { qty: "Aantal", none: "Geen artikelen vermeld." },
  it: { qty: "Qtà", none: "Nessun articolo elencato." },
  es: { qty: "Cant.", none: "No hay artículos." },
  pl: { qty: "Ilość", none: "Brak produktów." },
  sv: { qty: "Antal", none: "Inga artiklar angivna." },
};

const STATUS_LABELS_BY_LOCALE = {
  en: { pending: "Pending review", approved: "Approved", rejected: "Rejected" },
  de: { pending: "In Prüfung", approved: "Genehmigt", rejected: "Abgelehnt" },
  fr: { pending: "En cours d'examen", approved: "Approuvée", rejected: "Refusée" },
  nl: { pending: "In behandeling", approved: "Goedgekeurd", rejected: "Afgewezen" },
  it: { pending: "In revisione", approved: "Approvata", rejected: "Rifiutata" },
  es: { pending: "En revisión", approved: "Aprobada", rejected: "Rechazada" },
  pl: { pending: "W trakcie rozpatrywania", approved: "Zatwierdzony", rejected: "Odrzucony" },
  sv: { pending: "Under granskning", approved: "Godkänd", rejected: "Avvisad" },
};

// "de-DE" -> "de", with a fallback to English for anything unsupported.
function localeStrings(map, locale) {
  const lang = String(locale ?? "").toLowerCase().split(/[-_]/)[0];
  return map[lang] ?? map.en;
}

function renderLineItemsHtml(items = [], strings = LINE_ITEM_STRINGS.en) {
  if (!items.length) {
    return `<p style="margin:0 0 20px;font-size:14px;color:#6d7175">${strings.none}</p>`;
  }
  return items
    .map((item) => {
      const title = escapeHtml(item.title || "Item");
      const qty = item.quantity ?? 1;
      const variant = item.variantTitle ? escapeHtml(item.variantTitle) : "";
      const price = escapeHtml(formatMoney(item.price));
      const thumb = item.imageUrl
        ? `<img src="${escapeHtml(item.imageUrl)}" alt="${title}" width="56" height="56" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid #e1e3e5;display:block" />`
        : `<div style="width:56px;height:56px;border-radius:8px;border:1px solid #e1e3e5;background:#f1f2f3"></div>`;
      return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;border:1px solid #e1e3e5;border-radius:12px">
          <tr>
            <td style="padding:12px;width:56px;vertical-align:middle">${thumb}</td>
            <td style="padding:12px 4px;vertical-align:middle">
              <div style="font-size:14px;font-weight:600;color:#202223;line-height:1.3">${title}</div>
              ${variant ? `<div style="font-size:13px;color:#6d7175;margin-top:2px">${variant}</div>` : ""}
              <div style="font-size:12px;color:#8c9196;margin-top:2px">${strings.qty}: ${qty}</div>
            </td>
            <td style="padding:12px;vertical-align:middle;text-align:right;white-space:nowrap;font-size:14px;font-weight:600;color:#202223">${price}</td>
          </tr>
        </table>`;
    })
    .join("");
}

function statusLabel(status, locale) {
  const labels = localeStrings(STATUS_LABELS_BY_LOCALE, locale);
  return labels[status] ?? labels.pending;
}

// Bridges the internal buildEmailVariables() shape to the nested object the
// dotted Liquid paths read from. The one place that knows both naming schemes.
export function buildLiquidData(vars = {}) {
  const fullName = (vars.customerName || "").trim();
  const [firstName, ...rest] = fullName.split(/\s+/);
  const products = (vars.items ?? [])
    .map((item) => `${item.title ?? "Item"} × ${item.quantity ?? 1}`)
    .join(", ");
  const lineItemStrings = localeStrings(LINE_ITEM_STRINGS, vars.locale);

  return {
    customer: {
      first_name: firstName || "",
      last_name: rest.join(" "),
      email: vars.customerEmail || "",
    },
    order: {
      name: vars.orderNumber || "",
      id: vars.orderId || "",
    },
    withdrawal: {
      request_id: vars.requestId || "",
      submitted_at: formatDateTime(vars.submissionDate),
      reason: vars.reason || "",
      selected_products: products,
      line_items: renderLineItemsHtml(vars.items, lineItemStrings),
    },
    request: {
      status: statusLabel(vars.status, vars.locale),
      url: vars.reviewUrl || "",
    },
    shop: {
      name: vars.shopName || "",
      email: vars.merchantEmail || "",
    },
  };
}

// Sample data for previews, derived from the same builder so preview and send
// can never drift.
export const SAMPLE_LIQUID_DATA = buildLiquidData(SAMPLE_REQUEST_VARS);

// Resolves a dotted path against the data object. Returns undefined for an
// unknown path so the caller can decide whether to blank or keep it.
function resolvePath(path, data) {
  return path.split(".").reduce((value, key) => (value == null ? undefined : value[key]), data);
}

// Substitutes {{ path }} in an HTML body. Values are HTML-escaped (they include
// customer-typed names and reasons), but the surrounding markup — which the
// merchant authored — is left untouched. Unknown tokens are kept verbatim.
export function applyLiquid(html, data = {}) {
  if (!html) return "";
  return String(html).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path) => {
    if (!VALID_TOKENS.has(path)) return match;
    const value = resolvePath(path, data);
    if (value == null) return "";
    // HTML tokens are app-generated safe markup; everything else is escaped
    // because it can carry customer-typed text.
    return HTML_TOKENS.has(path) ? String(value) : escapeHtml(String(value));
  });
}

// Substitutes {{ path }} in plain text (the subject line). No HTML escaping —
// a subject is not markup, so "&" must stay "&".
export function applyLiquidText(text, data = {}) {
  if (!text) return "";
  return String(text).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path) => {
    if (!VALID_TOKENS.has(path)) return match;
    const value = resolvePath(path, data);
    if (value == null) return "";
    const str = String(value);
    // An HTML token in a plain-text context (e.g. a subject) is stripped to its
    // text — a table in a subject line would be nonsense.
    return HTML_TOKENS.has(path) ? str.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : str;
  });
}
