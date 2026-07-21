// Formats a Money value ({ amount, currencyCode }) from the order-status API
// using the buyer's browser locale, falling back to a plain "amount code"
// string if the currency code isn't one Intl recognizes.
export function formatMoney(money) {
  if (!money) return "";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: money.currencyCode,
    }).format(money.amount);
  } catch {
    return `${money.amount} ${money.currencyCode}`;
  }
}

// Sums a list of Money values into one. All lines of a single order share a
// currency, so the first entry's currencyCode is used. Returns null when
// there's nothing to sum so callers can skip rendering a total row.
export function sumMoney(monies) {
  const valid = (monies ?? []).filter(Boolean);
  if (valid.length === 0) return null;
  return {
    amount: valid.reduce((total, money) => total + Number(money.amount), 0),
    currencyCode: valid[0].currencyCode,
  };
}
