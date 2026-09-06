/* ==========================================================================
   EU Withdrawly prototype — sample data + persisted demo state
   Everything lives in localStorage under one key so "Reset demo" is trivial.
   ========================================================================== */

const EU_COUNTRIES = [
  ["AT", "Austria"], ["BE", "Belgium"], ["BG", "Bulgaria"], ["HR", "Croatia"],
  ["CY", "Cyprus"], ["CZ", "Czechia"], ["DK", "Denmark"], ["EE", "Estonia"],
  ["FI", "Finland"], ["FR", "France"], ["DE", "Germany"], ["GR", "Greece"],
  ["HU", "Hungary"], ["IE", "Ireland"], ["IT", "Italy"], ["LV", "Latvia"],
  ["LT", "Lithuania"], ["LU", "Luxembourg"], ["MT", "Malta"], ["NL", "Netherlands"],
  ["PL", "Poland"], ["PT", "Portugal"], ["RO", "Romania"], ["SK", "Slovakia"],
  ["SI", "Slovenia"], ["ES", "Spain"], ["SE", "Sweden"],
];
const COUNTRY_NAME = Object.fromEntries(EU_COUNTRIES);

const LANGUAGES = [
  ["en", "English"], ["de", "German"], ["fr", "French"], ["nl", "Dutch"],
  ["it", "Italian"], ["es", "Spanish"], ["pl", "Polish"], ["sv", "Swedish"],
  ["da", "Danish"], ["pt", "Portuguese"], ["fi", "Finnish"], ["cs", "Czech"],
];

/* --- default email templates ---------------------------------------------
   {{variables}} are replaced at send time. Merchants can edit each template
   and reset to these defaults. */

const EMAIL_VARIABLES = [
  ["customer_first_name", "Lena"],
  ["customer_name", "Lena Hoffmann"],
  ["order_name", "#2138"],
  ["request_id", "WR-1102"],
  ["request_date", "17 July 2026"],
  ["items_list", "1× Fjord Table Lamp — Oak, 2× Tind Candle Holder"],
  ["refund_amount", "€147.90"],
  ["deduction_amount", "€0.00"],
  ["return_address", "Nordlys Living Returns, Lagerstraße 12, 20095 Hamburg, Germany"],
  ["return_deadline", "31 July 2026"],
  ["rejection_reason", "The request was submitted outside the 14-day withdrawal window."],
  ["shop_name", "Nordlys Living"],
];

const DEFAULT_EMAILS = {
  ack: {
    name: "Acknowledgement",
    required: true,
    hint: "Sent instantly on every request — the confirmation “on a durable medium” Art. 11a requires. Can't be disabled.",
    subject: "We've received your withdrawal request for {{order_name}}",
    body: "Hi {{customer_first_name}},\n\nThis confirms that we received your withdrawal request for order {{order_name}} on {{request_date}}.\n\nItems: {{items_list}}\nReference: {{request_id}}\n\nWe'll review your request and respond within 14 days at the latest, as required by EU law.\n\n{{shop_name}}",
  },
  approved_cancel: {
    name: "Approved — order cancelled",
    hint: "For requests approved before shipping: the order is cancelled and refunded in full.",
    subject: "Your order {{order_name}} has been cancelled and refunded",
    body: "Hi {{customer_first_name}},\n\nGood news — your withdrawal request {{request_id}} has been approved. Order {{order_name}} was cancelled before shipping, so there's nothing to send back.\n\nYour refund of {{refund_amount}} is on its way to your original payment method and will arrive within 14 days.\n\n{{shop_name}}",
  },
  approved_return: {
    name: "Approved — return instructions",
    hint: "For delivered orders: how and where to send the items back.",
    subject: "Your withdrawal is approved — how to return your items",
    body: "Hi {{customer_first_name}},\n\nYour withdrawal request {{request_id}} for order {{order_name}} has been approved.\n\nPlease send the items back within 14 days (by {{return_deadline}}) to:\n{{return_address}}\n\nItems to return: {{items_list}}\n\nYour refund of {{refund_amount}} will be issued once we receive the items or you send us proof of postage.\n\n{{shop_name}}",
  },
  rejected: {
    name: "Rejected",
    hint: "Includes the reason you enter when rejecting a request.",
    subject: "About your withdrawal request for {{order_name}}",
    body: "Hi {{customer_first_name}},\n\nWe've reviewed your withdrawal request {{request_id}} for order {{order_name}} and unfortunately can't accept it.\n\nReason: {{rejection_reason}}\n\nIf you think this is a mistake, just reply to this email and we'll take another look.\n\n{{shop_name}}",
  },
  refunded: {
    name: "Refund issued",
    hint: "Sent when you issue the refund for a returned order.",
    subject: "Your refund for {{order_name}} is on its way",
    body: "Hi {{customer_first_name}},\n\nWe've issued your refund of {{refund_amount}} for order {{order_name}}. Depending on your bank it can take 5–10 business days to appear.\n\nThanks for giving us the chance to make this easy.\n\n{{shop_name}}",
  },
};

const DEFAULT_SETTINGS = {
  enabled: true,
  surfaces: { orderStatus: true, themeButton: true, themePage: true, checkout: false },
  countryMode: "all", // all | custom
  countries: EU_COUNTRIES.map(([code]) => code),
  languages: ["en", "de", "fr"],
  window: { days: 14, transitDays: 2 },
  eligibility: {
    exemptTags: ["personalized", "final-sale"],
    categories: { personalized: true, hygiene: true, perishable: false, digital: true },
    excludePOS: true,
    excludeB2B: false,
  },
  returns: {
    shippingPayer: "customer", // customer | merchant
    refundStandardShipping: true,
    withholdUntilReturn: true,
    returnDays: 14,
    restock: true,
    returnAddress: "Nordlys Living Returns\nLagerstraße 12\n20095 Hamburg\nGermany",
  },
  form: {
    reason: {
      enabled: true,
      label: "Reason (optional)",
      options: ["Changed my mind", "Wrong size or fit", "Item arrived damaged", "Found a better price", "Prefer not to say"],
    },
    comment: { enabled: true, label: "Anything we should know? (optional)" },
    iban: { enabled: false, label: "IBAN for your refund" },
  },
  labels: {
    buttonLabel: "Withdraw from purchase",
    title: "Withdraw from your purchase",
    description: "Under EU law you can withdraw from this purchase within 14 days of delivery — no reason needed.",
    itemHeading: "Select the items you want to return",
    confirmHeading: "Confirm your withdrawal",
    declaration: "I hereby withdraw from the contract of sale for the selected item(s).",
    doneTitle: "Withdrawal request received",
    doneMessage: "We've emailed you a confirmation. You'll hear from us within 14 days about your refund.",
    continueLabel: "Continue",
    confirmLabel: "Confirm withdrawal",
  },
  automation: {
    beforeShip: { hold: true, fallback: "hold", fallbackDays: 3, tag: true, tags: ["eu-withdrawal"] },
    afterDelivery: { action: "notify" },
    autoApprove: { enabled: false, maxValue: 50 },
    flagRepeat: { enabled: true, threshold: 3 },
    tagCustomer: false,
  },
  notifications: {
    merchantNew: true,
    merchantDigest: false,
    merchantEmail: "orders@nordlysliving.com",
  },
  emails: {
    branding: { fromName: "Nordlys Living", replyTo: "hello@nordlysliving.com", accent: "#2b45a8", showLogo: true },
    templates: Object.fromEntries(Object.entries(DEFAULT_EMAILS).map(([k, t]) => [k, { subject: t.subject, body: t.body }])),
  },
};

/* --- sample withdrawal requests ------------------------------------------
   Lifecycle: pending -> awaiting_return -> return_received -> refunded
                      \-> refunded (order cancelled before shipping)
                      \-> rejected                                          */

const PRODUCTS = [
  { title: "Fjord Table Lamp — Oak", sku: "NL-LAMP-01", price: 89, emoji: "\u{1F4A1}" },
  { title: "Alva Linen Cushion 50×50", sku: "NL-CUSH-14", price: 34, emoji: "\u{1F6CB}️" },
  { title: "Brygge Ceramic Vase", sku: "NL-VASE-07", price: 52, emoji: "\u{1F3FA}" },
  { title: "Skog Wool Throw — Moss", sku: "NL-THRW-03", price: 119, emoji: "\u{1F9F6}" },
  { title: "Tind Candle Holder", sku: "NL-CNDL-11", price: 27, emoji: "\u{1F56F}️" },
  { title: "Havn Serving Board", sku: "NL-BRD-02", price: 45, emoji: "\u{1F37D}️" },
  { title: "Lys Pendant Light", sku: "NL-PEND-05", price: 149, emoji: "\u{1F4A1}" },
  { title: "Strand Bath Towel Set", sku: "NL-TWL-09", price: 58, emoji: "\u{1F9FA}" },
];

function seedRequests() {
  const now = Date.now();
  const D = 24 * 60 * 60 * 1000;
  let n = 0;

  function mk(opts) {
    n += 1;
    const submittedAt = now - opts.daysAgo * D - ((n * 7 + 3) * 36e5) % (10 * 36e5);
    const decidedAt = opts.decidedDaysAgo != null ? now - opts.decidedDaysAgo * D : null;
    const items = opts.items.map(([pi, qty]) => ({ ...PRODUCTS[pi], qty }));
    const value = items.reduce((s, it) => s + it.price * it.qty, 0);
    const shipping = 4.9;

    const timeline = [
      { t: submittedAt, kind: "brand", title: "Request submitted", meta: `Via ${opts.type === "before_fulfillment" ? "order status page" : "storefront withdrawal page"}` },
      { t: submittedAt + 60e3, kind: "ok", title: "Acknowledgement email sent", meta: `Confirmation on a durable medium sent to ${opts.email}` },
    ];
    if (opts.type === "before_fulfillment") {
      timeline.push({ t: submittedAt + 90e3, kind: "brand", title: "Fulfillment hold applied", meta: "Order held from shipping while you review" });
    }
    if (opts.status === "refunded" && opts.type === "before_fulfillment") {
      timeline.push({ t: decidedAt, kind: "ok", title: "Request approved — order cancelled", meta: "Cancelled before shipping; items restocked" });
      timeline.push({ t: decidedAt + 60e3, kind: "ok", title: `Refund of ${fmtMoney(value + shipping)} issued`, meta: "Original payment method · includes standard shipping" });
    }
    if (["awaiting_return", "return_received", "refunded"].includes(opts.status) && opts.type === "after_delivery") {
      timeline.push({ t: decidedAt, kind: "ok", title: "Request approved", meta: "Return instructions emailed to customer" });
    }
    if (["return_received", "refunded"].includes(opts.status) && opts.type === "after_delivery") {
      timeline.push({ t: decidedAt + 3 * D, kind: "brand", title: "Return received", meta: "Marked received at the warehouse" });
    }
    if (opts.status === "refunded" && opts.type === "after_delivery") {
      timeline.push({ t: decidedAt + 3 * D + 36e5, kind: "ok", title: `Refund of ${fmtMoney(value + shipping - (opts.deduction || 0))} issued`, meta: opts.deduction ? `After ${fmtMoney(opts.deduction)} deduction for diminished value` : "Full refund incl. standard shipping" });
    }
    if (opts.status === "rejected") {
      timeline.push({ t: decidedAt, kind: "crit", title: "Request rejected", meta: opts.rejectReason || "Outside the withdrawal window" });
      timeline.push({ t: decidedAt + 60e3, kind: "crit", title: "Decision email sent", meta: `Sent to ${opts.email}` });
    }

    return {
      id: `WR-${1080 - n}`,
      orderName: `#${2140 - n * 3}`,
      customerName: opts.name,
      customerEmail: opts.email,
      countryCode: opts.cc,
      type: opts.type,
      reason: opts.reason,
      comment: opts.comment || "",
      items,
      orderLineCount: opts.orderLineCount ?? opts.items.length,
      value,
      shipping,
      deduction: opts.deduction || 0,
      currency: "EUR",
      status: opts.status,
      submittedAt,
      decidedAt,
      deadlineAt: submittedAt + 14 * D, // Art. 13: refund within 14 days of the request
      returnDueAt: decidedAt ? decidedAt + 14 * D : null,
      repeatCount: opts.repeatCount || 0,
      timeline,
      notes: opts.notes || [],
      tags: opts.tags || [],
    };
  }

  return [
    mk({ daysAgo: 0, name: "Lena Hoffmann", email: "lena.hoffmann@web.de", cc: "DE", type: "before_fulfillment", status: "pending", reason: "Changed my mind", items: [[0, 1], [4, 2]], orderLineCount: 3, tags: ["hold-applied"] }),
    mk({ daysAgo: 1, name: "Matthieu Roux", email: "m.roux@orange.fr", cc: "FR", type: "after_delivery", status: "pending", reason: "Wrong size or fit", comment: "The throw is lovely but too small for our sofa.", items: [[3, 1]] }),
    mk({ daysAgo: 1, name: "Sofie Janssen", email: "sofie.janssen@gmail.com", cc: "NL", type: "before_fulfillment", status: "pending", reason: "Found a better price", items: [[6, 1]], orderLineCount: 2, tags: ["hold-applied"], repeatCount: 4 }),
    mk({ daysAgo: 3, name: "Aoife Byrne", email: "aoife.byrne@gmail.com", cc: "IE", type: "after_delivery", status: "pending", reason: "Item arrived damaged", comment: "Small chip on the rim of the vase, photo available on request.", items: [[2, 1]], tags: ["damage-claim"], notes: [{ t: now2() - 2 * 86400e3, body: "Asked customer for a photo of the damage." }] }),
    mk({ daysAgo: 10, name: "Karl Näslund", email: "karl.naslund@icloud.com", cc: "SE", type: "after_delivery", status: "pending", reason: "Prefer not to say", items: [[7, 1], [1, 2]], orderLineCount: 3 }),
    mk({ daysAgo: 4, decidedDaysAgo: 3, name: "Julia Nowak", email: "julia.nowak@wp.pl", cc: "PL", type: "after_delivery", status: "awaiting_return", reason: "Changed my mind", items: [[1, 2]] }),
    mk({ daysAgo: 7, decidedDaysAgo: 6, name: "Marco De Luca", email: "marco.deluca@libero.it", cc: "IT", type: "after_delivery", status: "awaiting_return", reason: "Wrong size or fit", items: [[5, 1]] }),
    mk({ daysAgo: 9, decidedDaysAgo: 8, name: "Elena García", email: "elena.garcia@gmail.com", cc: "ES", type: "after_delivery", status: "return_received", reason: "Changed my mind", items: [[0, 1]], notes: [{ t: now2() - 86400e3, body: "Lamp came back in original packaging, like new." }] }),
    mk({ daysAgo: 2, decidedDaysAgo: 1, name: "Hannah Meyer", email: "h.meyer@gmx.de", cc: "DE", type: "before_fulfillment", status: "refunded", reason: "Changed my mind", items: [[4, 1]], orderLineCount: 1 }),
    mk({ daysAgo: 11, decidedDaysAgo: 9, name: "Thomas Peeters", email: "t.peeters@telenet.be", cc: "BE", type: "after_delivery", status: "refunded", reason: "Item arrived damaged", items: [[4, 1], [2, 1]] }),
    mk({ daysAgo: 13, decidedDaysAgo: 12, name: "Anna Novakova", email: "anna.novakova@seznam.cz", cc: "CZ", type: "before_fulfillment", status: "refunded", reason: "Prefer not to say", items: [[3, 1]] }),
    mk({ daysAgo: 16, decidedDaysAgo: 13, name: "Ingrid Bakker", email: "ingrid.bakker@kpnmail.nl", cc: "NL", type: "after_delivery", status: "refunded", reason: "Wrong size or fit", items: [[7, 2]], deduction: 12, notes: [{ t: now2() - 12 * 86400e3, body: "Towels were washed — deducted €12 diminished value." }] }),
    mk({ daysAgo: 9, decidedDaysAgo: 8, name: "Pierre Dubois", email: "p.dubois@free.fr", cc: "FR", type: "after_delivery", status: "rejected", reason: "Changed my mind", rejectReason: "Custom-engraved item — exempt from withdrawal (Art. 16(c))", items: [[6, 1]], tags: ["exemption"] }),
    mk({ daysAgo: 18, decidedDaysAgo: 16, name: "Hans Gruber", email: "hans.gruber@gmx.at", cc: "AT", type: "after_delivery", status: "rejected", reason: "Prefer not to say", rejectReason: "Request submitted 41 days after delivery — outside the window", items: [[5, 2]] }),
    mk({ daysAgo: 22, decidedDaysAgo: 20, name: "Marta Silva", email: "marta.silva@sapo.pt", cc: "PT", type: "after_delivery", status: "refunded", reason: "Wrong size or fit", items: [[1, 1]] }),
  ];
}
function now2() { return Date.now(); }

/* 30-day submissions series for charts (deterministic pseudo-random) */
function seedSeries() {
  const out = [];
  const D = 24 * 60 * 60 * 1000;
  for (let i = 29; i >= 0; i--) {
    const x = Math.sin(i * 12.9898) * 43758.5453;
    const r = x - Math.floor(x);
    const weekly = Math.sin(((29 - i) / 7) * Math.PI) * 0.6 + 1;
    out.push({ t: Date.now() - i * D, v: Math.max(0, Math.round(r * 3.4 * weekly + ((29 - i) > 20 ? 1 : 0))) });
  }
  return out;
}

/* --- persisted state ------------------------------------------------------ */

const STORE_KEY = "eu-withdrawly-proto-v2";

function defaultState() {
  return {
    onboarding: { completed: false, step: 0, dpa: false },
    guide: { dismissed: false, steps: { dpa: true, button: false, orderStatus: true, form: false, test: false } },
    plan: "Starter",
    settings: structuredClone(DEFAULT_SETTINGS),
    requests: seedRequests(),
    series: seedSeries(),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupt state -> reseed */ }
  return defaultState();
}

function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(State)); } catch (e) { /* storage full/blocked */ }
}

function resetDemo() {
  localStorage.removeItem(STORE_KEY);
  location.hash = "";
  location.reload();
}

/* --- formatting helpers --------------------------------------------------- */

function fmtMoney(v, cur = "EUR") {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: cur, maximumFractionDigits: v % 1 ? 2 : 0 }).format(v);
}
function fmtDate(t) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(t);
}
function fmtDateLong(t) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(t);
}
function fmtDateTime(t) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(t);
}
function timeAgo(t) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : `${d}d ago`;
}
function daysLeft(t) {
  return Math.ceil((t - Date.now()) / 86400000);
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function flag(cc) {
  return cc.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/* Replace {{variables}} with sample values (email previews). */
function fillVariables(text, overrides = {}) {
  const map = { ...Object.fromEntries(EMAIL_VARIABLES), ...overrides };
  return text.replace(/\{\{(\w+)\}\}/g, (m, k) => map[k] ?? m);
}

const State = loadState();
