import i18next from "i18next";
import en from "./locales/en.json";

// Admin (merchant-facing) translations. Customer-facing copy is localized
// separately: the storefront form in routes/_app.form-setup/translations.js and
// the extensions' own locales/, and customer emails in
// services/email/email-strings.js.
//
// Adding a language:
//   1. Copy locales/en.json to locales/<code>.json and translate the values
//      (keep every key; plural keys use i18next's _one/_other suffixes).
//   2. Import it below and add it to RESOURCES.
// Everything else (locale detection, fallbacks, <html lang>) reads
// SUPPORTED_LOCALES, so nothing outside this file needs to change.
const RESOURCES = {
  en: { translation: en },
};

export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = Object.keys(RESOURCES);

// "de-DE" / "de_DE" / "DE" -> "de" when supported, otherwise the default. An
// exact regional match ("pt-BR") wins over its base language when both exist.
export function resolveLocale(candidate) {
  if (!candidate) return DEFAULT_LOCALE;
  const normalized = String(candidate).trim().replace("_", "-").toLowerCase();
  const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === normalized);
  if (exact) return exact;
  const base = normalized.split("-")[0];
  return SUPPORTED_LOCALES.includes(base) ? base : DEFAULT_LOCALE;
}

// A fresh, fully initialised instance per call. Resources are bundled, so
// initialisation is synchronous — no suspense or loading state on either the
// server or the client. A separate instance (rather than changeLanguage on a
// shared one) keeps concurrent server renders in different locales isolated.
export function createI18n(locale = DEFAULT_LOCALE) {
  const instance = i18next.createInstance();
  instance.init({
    resources: RESOURCES,
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

// Shared read-only instance for code with no request or React context (server
// services, validation messages recorded in English). Only ever read through
// getFixedT, which never mutates the instance's language, so sharing it across
// concurrent requests is safe.
const sharedI18n = createI18n(DEFAULT_LOCALE);

export function getFixedT(locale = DEFAULT_LOCALE) {
  return sharedI18n.getFixedT(resolveLocale(locale));
}

// Default-locale translator, for text that's stored or sent before any
// merchant locale is known (automation log fallbacks, notes on Shopify orders).
export const tDefault = getFixedT(DEFAULT_LOCALE);
