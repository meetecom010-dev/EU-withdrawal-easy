import i18next from "i18next";
import cs from "./locales/cs.json";
import da from "./locales/da.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fi from "./locales/fi.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import nb from "./locales/nb.json";
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import ptBR from "./locales/pt-BR.json";
import ptPT from "./locales/pt-PT.json";
import sv from "./locales/sv.json";
import th from "./locales/th.json";
import tr from "./locales/tr.json";
import vi from "./locales/vi.json";
import zhCN from "./locales/zh-CN.json";
import zhTW from "./locales/zh-TW.json";

// Admin (merchant-facing) translations. Customer-facing copy is localized
// separately: the storefront form in routes/_app.form-setup/translations.js and
// the extensions' own locales/, and customer emails in
// services/email/email-strings.js.
//
// The admin ships in every language the Shopify admin itself offers, so the
// merchant's admin language (Shopify's `locale` param) always has a match.
//
// Adding a language:
//   1. Copy locales/en.json to locales/<code>.json and translate the values
//      (keep every key; plural keys use i18next's suffixes, and each language
//      needs every category Intl.PluralRules reports for it, e.g. _few/_many
//      for Polish and Czech, _many for French, Spanish, Italian, Portuguese).
//   2. Import it above and add it to RESOURCES.
// Everything else (locale detection, fallbacks, <html lang>) reads
// SUPPORTED_LOCALES, so nothing outside this file needs to change.
const RESOURCES = {
  en: { translation: en },
  cs: { translation: cs },
  da: { translation: da },
  de: { translation: de },
  es: { translation: es },
  fi: { translation: fi },
  fr: { translation: fr },
  it: { translation: it },
  ja: { translation: ja },
  ko: { translation: ko },
  nb: { translation: nb },
  nl: { translation: nl },
  pl: { translation: pl },
  "pt-BR": { translation: ptBR },
  "pt-PT": { translation: ptPT },
  sv: { translation: sv },
  th: { translation: th },
  tr: { translation: tr },
  vi: { translation: vi },
  "zh-CN": { translation: zhCN },
  "zh-TW": { translation: zhTW },
};

export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = Object.keys(RESOURCES);

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
