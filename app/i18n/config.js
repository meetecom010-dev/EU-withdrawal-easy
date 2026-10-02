import i18next from "i18next";
import en from "./locales/en.json";

// Admin (merchant-facing) translations. Customer-facing copy is localized
// separately: the storefront form in routes/_app.form-setup/translations.js and
// the extensions' own locales/, and customer emails in
// services/email/email-strings.js.
//
// The admin ships in every language the Shopify admin itself offers, so the
// merchant's admin language (Shopify's `locale` param) always has a match.
//
// Only English is bundled here: it's the fallback for every language and the
// default-locale text server code records. The other languages live in
// resources.server.js, and the root loader sends the browser just the one the
// merchant is using — shipping all of them made every admin page download
// over a megabyte of translations it would never show.
//
// Adding a language:
//   1. Copy locales/en.json to locales/<code>.json and translate the values
//      (keep every key; plural keys use i18next's suffixes, and each language
//      needs every category Intl.PluralRules reports for it, e.g. _few/_many
//      for Polish and Czech, _many for French, Spanish, Italian, Portuguese).
//   2. Add the code to SUPPORTED_LOCALES below and import the file in
//      resources.server.js.
// Everything else (locale detection, fallbacks, <html lang>) reads
// SUPPORTED_LOCALES, so nothing else needs to change.
export const DEFAULT_LOCALE = "en";

export const SUPPORTED_LOCALES = [
  "en",
  "cs",
  "da",
  "de",
  "es",
  "fi",
  "fr",
  "it",
  "ja",
  "ko",
  "nb",
  "nl",
  "pl",
  "pt-BR",
  "pt-PT",
  "sv",
  "th",
  "tr",
  "vi",
  "zh-CN",
  "zh-TW",
];

// Codes that name a supported language differently: Norwegian as "no"/"nn",
// Portuguese and Chinese without a region, and Chinese script or region
// variants that share a written form with a supported locale.
const LOCALE_ALIASES = {
  no: "nb",
  nn: "nb",
  pt: "pt-BR",
  zh: "zh-CN",
  "zh-hans": "zh-CN",
  "zh-sg": "zh-CN",
  "zh-hant": "zh-TW",
  "zh-hk": "zh-TW",
  "zh-mo": "zh-TW",
};

// "de-DE" / "de_DE" / "DE" -> "de", "pt" -> "pt-BR", "zh-HK" -> "zh-TW";
// null when nothing matches. An exact regional match ("pt-PT") wins over its
// base language.
export function matchLocale(candidate) {
  if (!candidate) return null;
  const normalized = String(candidate).trim().replaceAll("_", "-").toLowerCase();
  const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === normalized);
  if (exact) return exact;
  // "zh-Hant-HK" -> "zh-hant", then "zh".
  const parts = normalized.split("-");
  for (let length = parts.length; length > 0; length -= 1) {
    const prefix = parts.slice(0, length).join("-");
    if (LOCALE_ALIASES[prefix]) return LOCALE_ALIASES[prefix];
    if (SUPPORTED_LOCALES.includes(prefix)) return prefix;
  }
  return null;
}

// Like matchLocale, but falls back to the default for unsupported languages.
export function resolveLocale(candidate) {
  return matchLocale(candidate) ?? DEFAULT_LOCALE;
}

/**
 * A fresh, fully initialised instance per call. Resources are passed in, so
 * initialisation is synchronous — no suspense or loading state on either the
 * server or the client. A separate instance (rather than changeLanguage on a
 * shared one) keeps concurrent server renders in different locales isolated.
 *
 * @param {string} locale
 * @param {Record<string, object>} [translations] extra languages by code
 *   (English is always included as the fallback).
 */
export function createI18n(locale = DEFAULT_LOCALE, translations = {}) {
  const resources = { en: { translation: en } };
  for (const [code, translation] of Object.entries(translations)) {
    if (translation) resources[code] = { translation };
  }
  const instance = i18next.createInstance();
  instance.init({
    resources,
    lng: resolveLocale(locale),
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    initAsync: false,
    returnNull: false,
    // React escapes rendered text already.
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}

// Default-locale translator, for text that's stored or sent before any
// merchant locale is known (automation log fallbacks, notes on Shopify
// orders). Read-only: getFixedT never mutates the shared instance's language,
// so sharing it across concurrent requests is safe.
export const tDefault = createI18n(DEFAULT_LOCALE).getFixedT(DEFAULT_LOCALE);
