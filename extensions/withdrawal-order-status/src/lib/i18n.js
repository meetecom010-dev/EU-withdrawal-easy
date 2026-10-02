// Thin wrapper over the extension's Localization API (shopify.i18n). The
// runtime resolves the buyer's locale against the bundled locales/*.json,
// falling back to locales/en.default.json when the buyer's language isn't one
// we ship. Keys and `{{placeholder}}` interpolation are defined in those files.
//
// Wrapped defensively: if the i18n runtime is ever unavailable the form should
// still render rather than throw, so a lookup failure returns the key itself.

export function t(key, options) {
  try {
    return shopify.i18n.translate(key, options);
  } catch {
    return key;
  }
}

// Why the form can't be used for this order, in the buyer's language. The
// backend only sends an English fallback message; the `code` picks the
// translated copy here. Unknown codes fall back to a generic line.
const ELIGIBILITY_CODES = new Set([
  "order_not_found",
  "order_cancelled",
  "already_requested",
  "not_eligible",
]);

export function eligibilityMessage(code, expiresAt) {
  if (code === "deadline_passed") {
    const date = expiresAt ? new Date(expiresAt) : null;
    return date && !Number.isNaN(date.getTime())
      ? t("eligibility.deadline_passed", { date: formatLocaleDate(date) })
      : t("eligibility.deadline_passed_no_date");
  }
  return t(`eligibility.${ELIGIBILITY_CODES.has(code) ? code : "not_eligible"}`);
}

// A failed submission, in the buyer's language — eligibility codes read the
// same as they do before the form opens.
const SUBMIT_ERROR_CODES = new Set([
  "order_not_found",
  "invalid_items",
  "duplicate_request",
  "rate_limited",
]);

export function submitErrorMessage(error) {
  const code = error?.code;
  if (SUBMIT_ERROR_CODES.has(code)) return t(`error.${code}`);
  if (code === "deadline_passed" || ELIGIBILITY_CODES.has(code) || code === "form_disabled") {
    return eligibilityMessage(code, error?.expiresAt);
  }
  return t("error.submit");
}

// Localised date, formatted for the buyer's locale (used in the submitted-on
// line). Falls back to the platform's default toLocaleDateString on failure.
export function formatLocaleDate(date) {
  try {
    return shopify.i18n.formatDate(date, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return date.toLocaleDateString();
  }
}
