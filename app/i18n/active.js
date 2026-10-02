import { tDefault } from "./config";

// The i18n instance the page is rendering with, for code outside React (the
// API fetch helper's fallback error). Set by I18nProvider; before that, or on
// the server, English is used.
let activeI18n = null;

export function setActiveI18n(instance) {
  activeI18n = instance;
}

export function activeT(key, options) {
  return activeI18n ? activeI18n.t(key, options) : tDefault(key, options);
}
