/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useMemo, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { createI18n } from "./config";
import { setActiveI18n } from "./active";
import {
  formatDate,
  formatDateTime,
  formatList,
  formatLongDateTime,
  formatMoney,
  languageName,
  regionName,
} from "./format";

// Created once per mount from the locale the document was rendered with (and
// that locale's translations, sent by the root loader). Loader revalidations
// don't carry Shopify's `locale` param, so re-deriving the instance from later
// loader data could flip languages mid-session.
export function I18nProvider({ locale, translations, children }) {
  const [i18n] = useState(() => {
    const instance = createI18n(locale, translations);
    // Browser only: on the server every request renders with its own instance,
    // and a module-level one would leak between concurrent renders.
    if (typeof window !== "undefined") setActiveI18n(instance);
    return instance;
  });
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

// The format.js helpers bound to the active language.
export function useFormatters() {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useMemo(
    () => ({
      locale,
      formatMoney: (money) => formatMoney(money, locale),
      formatDate: (value) => formatDate(value, locale),
      formatDateTime: (value) => formatDateTime(value, locale),
      formatLongDateTime: (value) => formatLongDateTime(value, locale),
      formatList: (items) => formatList(items, locale),
      regionName: (code) => regionName(code, locale),
      languageName: (code) => languageName(code, locale),
    }),
    [locale],
  );
}
