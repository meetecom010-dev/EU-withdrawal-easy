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

// Localised date, formatted for the buyer's locale (used in the submitted-on
// line). Falls back to the platform's default toLocaleDateString on failure.
export function formatLocaleDate(date) {
  try {
    return shopify.i18n.formatDate(date, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return date.toLocaleDateString();
  }
}
