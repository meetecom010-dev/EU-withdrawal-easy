// Shared between the frontend (app/routes/_app.form-setup) and the
// /api/form-settings route so both sides agree on option lists. The
// formSettings defaults themselves live in the Mongoose schema
// (app/models/app-settings.server.js), not here.

import { DEFAULT_TRANSLATIONS, fillTranslationDefaults } from "./translations";

export const EU_COUNTRIES = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
];

export const AVAILABLE_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "nl", name: "Dutch" },
  { code: "it", name: "Italian" },
  { code: "es", name: "Spanish" },
  { code: "pl", name: "Polish" },
  { code: "sv", name: "Swedish" },
];

// The automation choices, kept here rather than in AutomationCard.jsx because
// validation.js runs on the server too (see services/app-settings.server.js)
// and can't pull in a component module to find out which values are legal.
export const FALLBACK_OPTIONS = [
  { value: "hold", label: "Do nothing — hold until staff act" },
  { value: "cancel-now", label: "Cancel and refund immediately" },
  // Hidden before app submission. The backend automation, the "Number of days"
  // field (AutomationCard), and validation all still support these values — to
  // offer the timed auto-actions again, just uncomment these two options.
  // { value: "release-n", label: "Release the hold after N days" },
  // { value: "cancel-n", label: "Cancel and refund after N days" },
];

export const AFTER_DELIVERY_ACTIONS = ["notify_only", "create_return"];

// countryMode governs eligibility: "all" ignores the stored euCountries and
// resolves to the explicit full EU list (so the admin UI and the extension
// always see a concrete selection), "specific" passes the stored list
// through. Documents saved before countryMode existed derive it from the
// legacy convention where an empty euCountries array meant "all".
//
// Also backfills array fields that were added to the schema after some shops
// already had a saved formSettings document — Mongoose only applies schema
// defaults to paths missing from brand-new documents, not to those absent
// from documents that already existed in the DB, so older shops can come
// back from the DB with these as `undefined`.
export function resolveFormSettings(settings) {
  const storedCountries = settings.euCountries ?? [];
  const countryMode =
    settings.countryMode ?? (storedCountries.length === 0 ? "all" : "specific");
  return {
    ...settings,
    countryMode,
    euCountries: countryMode === "all" ? EU_COUNTRIES.map((c) => c.code) : storedCountries,
    reasonField: {
      ...settings.reasonField,
      options: settings.reasonField.options ?? [],
    },
    translations: seedTranslations(settings),
    automation: {
      ...settings.automation,
      beforeShipTags: settings.automation.beforeShipTags ?? [],
      afterDeliveryTags: settings.automation.afterDeliveryTags ?? [],
    },
  };
}

// English is the base language: the required, always-complete label set every
// other language falls back to, field by field.
export const BASE_LOCALE = "en";

// Fills every offered non-English language with a complete translation: the
// merchant's own values where present, the default catalog copy elsewhere. This
// is what makes each language ship prefilled with professional copy (and get
// served to shoppers) rather than blank fields — see translations.js. Idempotent
// and blank-preserving, so it's safe to run on every read.
function seedTranslations(settings) {
  const existing = normalizeTranslations(settings.translations);
  const languages = settings.languages ?? [BASE_LOCALE];
  const englishLabels = settings.labels ?? {};
  const englishOptions = settings.reasonField?.options ?? [];
  const out = { ...existing };
  for (const lang of languages) {
    if (lang === BASE_LOCALE) continue;
    if (!DEFAULT_TRANSLATIONS[lang] && !existing[lang]) continue;
    out[lang] = fillTranslationDefaults(lang, englishLabels, englishOptions, existing[lang]);
  }
  return out;
}

// "de-DE" / "de_DE" -> "de". Buyer locales arrive region-tagged; translations
// are keyed by language code.
export function toLanguageCode(locale) {
  return String(locale ?? "").toLowerCase().split(/[-_]/)[0];
}

// Coerces the translations value to a plain nested object, tolerating a Mongoose
// Map (when a doc wasn't read with flattenMaps) and the labels sub-Map.
function normalizeTranslations(translations) {
  if (!translations) return {};
  const entries = translations instanceof Map ? translations : Object.entries(translations);
  const out = {};
  for (const [locale, value] of entries instanceof Map ? entries.entries() : entries) {
    const labels = value?.labels;
    out[locale] = {
      labels: labels instanceof Map ? Object.fromEntries(labels) : labels ?? {},
      reasonLabel: value?.reasonLabel ?? "",
      reasonOptions: value?.reasonOptions ?? [],
    };
  }
  return out;
}

// Resolves the customer-facing labels + reason field for a locale: the English
// base with that locale's sparse translation merged on top, field by field.
// Any blank or missing translation falls back to the English value, so a
// partially translated form is never left with empty copy.
export function resolveLabelsForLocale(settings, locale) {
  const lang = toLanguageCode(locale);
  const baseLabels = settings.labels ?? {};
  const baseReason = settings.reasonField ?? {};
  const translations = normalizeTranslations(settings.translations);
  // Only serve a translation for a language the merchant still offers. Dropping
  // a language from the Languages card stops its translation being served
  // (buyers fall back to English) without discarding the merchant's typed copy,
  // so re-adding the language brings it straight back.
  const offered = settings.languages ?? [BASE_LOCALE];
  const t =
    lang && lang !== BASE_LOCALE && offered.includes(lang) ? translations[lang] : null;

  if (!t) {
    return { labels: baseLabels, reasonField: { ...baseReason, options: baseReason.options ?? [] } };
  }

  const pick = (translated, fallback) =>
    typeof translated === "string" && translated.trim() !== "" ? translated : fallback;

  const labels = {};
  for (const [key, value] of Object.entries(baseLabels)) {
    labels[key] = pick(t.labels?.[key], value);
  }

  const baseOptions = baseReason.options ?? [];
  const options = baseOptions.map((opt, i) => pick(t.reasonOptions?.[i], opt));

  return {
    labels,
    reasonField: { ...baseReason, label: pick(t.reasonLabel, baseReason.label), options },
  };
}
