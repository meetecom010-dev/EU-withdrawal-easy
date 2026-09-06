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

export function countryName(countryCode) {
  if (!countryCode) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
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
