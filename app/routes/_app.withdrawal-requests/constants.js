export const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "New" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export const STATUS_TONE = {
  pending: "warning",
  approved: "success",
  rejected: "critical",
};

export const STATUS_LABEL = {
  pending: "New",
  approved: "Approved",
  rejected: "Rejected",
};

// Where the customer submitted the withdrawal form. `order_status` is the order
// status page extension; `standalone_page` is the storefront theme app
// extension (the "theme page"). Mirrors the surfaces in
// services/withdrawal-eligibility.server.js.
export const SOURCE_LABEL = {
  order_status: "Order status page",
  standalone_page: "Theme page",
};

// Whether every line item on the order was requested for withdrawal (vs a
// subset). `orderLineCount` is only known for requests submitted after this
// field was added — older requests fall back to just counting items,
// which reads as "Withdrawal request" rather than claiming full/partial.
export function withdrawalType(request) {
  if (!request.orderLineCount) return null;
  return request.items.length >= request.orderLineCount ? "Full withdrawal" : "Partial withdrawal";
}

// Sums a withdrawal request's line items into a single { amount, currencyCode }
// total. Each item's price is already the line's total (quantity-inclusive —
// see OrderStatusApi's CartLineCost.totalAmount, which is what the extension
// submits), so this doesn't multiply by quantity again. Items without
// pricing (e.g. a price lookup failure at submission time) are skipped
// rather than treated as zero.
export function requestTotal(items) {
  const priced = items.filter((item) => item.price?.currencyCode);
  if (priced.length === 0) return null;
  return {
    amount: priced.reduce((sum, item) => sum + (item.price.amount ?? 0), 0),
    currencyCode: priced[0].price.currencyCode,
  };
}

export function formatMoney(money) {
  if (!money) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: money.currencyCode,
    }).format(money.amount);
  } catch {
    return `${money.amount} ${money.currencyCode}`;
  }
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// A longer, sentence-style timestamp for the request header line, e.g.
// "September 21, 2026 at 11:29 am".
export function formatSubmittedAt(value) {
  const date = new Date(value);
  const day = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = date
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
  return `${day} at ${time}`;
}

export function countryName(countryCode) {
  if (!countryCode) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const CSV_COLUMNS = [
  { header: "Order", value: (r) => r.orderName },
  { header: "Customer name", value: (r) => r.customerName },
  { header: "Customer email", value: (r) => r.customerEmail },
  { header: "Country", value: (r) => countryName(r.countryCode) },
  { header: "Items", value: (r) => r.items.length },
  { header: "Value", value: (r) => formatMoney(requestTotal(r.items)) },
  { header: "Reason", value: (r) => r.reason },
  { header: "Status", value: (r) => STATUS_LABEL[r.status] },
  { header: "Submitted", value: (r) => formatDateTime(r.submittedAt) },
  { header: "Decided", value: (r) => (r.decidedAt ? formatDateTime(r.decidedAt) : "") },
];

export function requestsToCsv(requests) {
  const rows = [CSV_COLUMNS.map((col) => col.header)];
  for (const request of requests) {
    rows.push(CSV_COLUMNS.map((col) => csvEscape(col.value(request))));
  }
  return rows.map((row) => row.join(",")).join("\r\n");
}

// Builds the CSV in-browser from the already-loaded requests (no extra
// server round trip) and triggers a download via a throwaway object URL.
export function downloadRequestsCsv(requests) {
  const csv = requestsToCsv(requests);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `withdrawal-requests-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// The customer's language in English (for staff), from the locale captured at
// submission ("de-DE" -> "German"). Drives the language the decision emails are
// sent in.
export function languageName(locale) {
  if (!locale) return null;
  const lang = String(locale).toLowerCase().split(/[-_]/)[0];
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(lang) ?? lang.toUpperCase();
  } catch {
    return lang.toUpperCase();
  }
}

// Under the EU right of withdrawal (Directive 2011/83/EU, Art. 13), a trader
// must reimburse the customer without undue delay and within 14 days of
// being informed of the withdrawal decision — i.e. 14 days from
// `submittedAt`. For a still-pending request this is a live countdown to
// "now"; for a decided one it's a fixed comparison against `decidedAt`, so
// the badge reflects whether the decision landed inside or outside the
// window instead of continuing to count down.
const REFUND_WINDOW_DAYS = 14;

export function withdrawalDeadline(request) {
  const deadline = new Date(request.submittedAt);
  deadline.setDate(deadline.getDate() + REFUND_WINDOW_DAYS);

  const reference = request.status === "pending" ? new Date() : new Date(request.decidedAt);
  const msLeft = deadline.getTime() - reference.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  return { deadline, daysLeft, overdue: msLeft < 0 };
}
