import {
  formatDateTime,
  formatMoney as formatMoneyForLocale,
  regionName,
} from "../../i18n/format";

// Status filter tabs. Labels are `status.<key>` in en.json ("all" is
// requests.tabs.all).
export const STATUS_TABS = ["all", "pending", "approved", "rejected"];

export const STATUS_TONE = {
  pending: "warning",
  approved: "success",
  rejected: "critical",
};

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

function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Column headers are requests.csv.<key>; values are formatted for the
// merchant's locale so the export reads the same as the table.
const CSV_COLUMNS = [
  { key: "order", value: (r) => r.orderName },
  { key: "customerName", value: (r) => r.customerName },
  { key: "customerEmail", value: (r) => r.customerEmail },
  { key: "country", value: (r, { locale }) => regionName(r.countryCode, locale) },
  { key: "items", value: (r) => r.items.length },
  { key: "value", value: (r, { locale }) => formatMoneyForLocale(requestTotal(r.items), locale) },
  { key: "reason", value: (r) => r.reason },
  { key: "status", value: (r, { t }) => t(`status.${r.status}`) },
  { key: "submitted", value: (r, { locale }) => formatDateTime(r.submittedAt, locale) },
  { key: "decided", value: (r, { locale }) => (r.decidedAt ? formatDateTime(r.decidedAt, locale) : "") },
];

export function requestsToCsv(requests, { t, locale }) {
  const rows = [CSV_COLUMNS.map((col) => t(`requests.csv.${col.key}`))];
  for (const request of requests) {
    rows.push(CSV_COLUMNS.map((col) => csvEscape(col.value(request, { t, locale }))));
  }
  return rows.map((row) => row.join(",")).join("\r\n");
}

// Builds the CSV in-browser from the already-loaded requests (no extra
// server round trip) and triggers a download via a throwaway object URL.
export function downloadRequestsCsv(requests, { t, locale }) {
  const csv = requestsToCsv(requests, { t, locale });
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
