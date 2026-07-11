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
