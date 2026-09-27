// Locale-aware formatting for the admin. Every function takes the display
// locale explicitly (the active i18n language), so the server render and the
// browser produce the same text instead of each falling back to its own
// default locale.

export function formatMoney(money, locale) {
  if (!money) return "—";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: money.currencyCode,
    }).format(money.amount);
  } catch {
    return `${money.amount} ${money.currencyCode}`;
  }
}

// "Sep 21, 2026, 11:29 AM"
export function formatDateTime(value, locale) {
  return new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

// "Sep 21, 2026"
export function formatDate(value, locale) {
  return new Date(value).toLocaleDateString(locale, { dateStyle: "medium" });
}

// "September 21, 2026 at 11:29 AM"
export function formatLongDateTime(value, locale) {
  return new Date(value).toLocaleString(locale, { dateStyle: "long", timeStyle: "short" });
}

// "A, B, and C"
export function formatList(items, locale) {
  try {
    return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);
  } catch {
    return items.join(", ");
  }
}

// "AT" -> "Austria", in the display locale.
export function regionName(code, locale) {
  if (!code) return null;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

// "de-DE" / "de" -> "German", in the display locale.
export function languageName(code, locale) {
  if (!code) return null;
  const lang = String(code).toLowerCase().split(/[-_]/)[0];
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(lang) ?? lang.toUpperCase();
  } catch {
    return lang.toUpperCase();
  }
}
