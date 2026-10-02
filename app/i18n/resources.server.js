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
import { createI18n, DEFAULT_LOCALE, resolveLocale } from "./config";

// Every admin language, server-side only (the .server suffix keeps these out
// of the browser bundle). The browser gets just the merchant's language from
// the root loader — see translationsFor().
const TRANSLATIONS = {
  en,
  cs,
  da,
  de,
  es,
  fi,
  fr,
  it,
  ja,
  ko,
  nb,
  nl,
  pl,
  "pt-BR": ptBR,
  "pt-PT": ptPT,
  sv,
  th,
  tr,
  vi,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
};

// The resources createI18n needs for one locale (English is always added
// there as the fallback, so it isn't repeated here).
export function translationsFor(locale) {
  const resolved = resolveLocale(locale);
  return resolved === DEFAULT_LOCALE ? {} : { [resolved]: TRANSLATIONS[resolved] };
}

// Shared read-only instance holding every language, for server code that
// translates for a request's locale (API errors, the login page). Only read
// through getFixedT, which never mutates the instance's language.
const serverI18n = createI18n(DEFAULT_LOCALE, TRANSLATIONS);

export function getFixedT(locale = DEFAULT_LOCALE) {
  return serverI18n.getFixedT(resolveLocale(locale));
}
