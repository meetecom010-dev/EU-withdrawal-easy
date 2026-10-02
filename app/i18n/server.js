import { DEFAULT_LOCALE, matchLocale, resolveLocale } from "./config";
import { getFixedT, translationsFor } from "./resources.server";

export { translationsFor };

// Shopify appends `locale` (the merchant's admin language) to the embedded
// app URL on every document load. Later data requests don't carry it, so the
// browser's Accept-Language is the fallback — the client's apiFetch sets that
// header to the language the page is already displaying (see
// utils/api/client.js), which keeps API errors in the same language as the UI.
export function getLocaleFromRequest(request) {
  const url = new URL(request.url);
  const fromParam = url.searchParams.get("locale");
  if (fromParam) return resolveLocale(fromParam);

  const header = request.headers.get("accept-language");
  if (header) {
    // First language the browser prefers that we actually support.
    const match = header
      .split(",")
      .map((part) => matchLocale(part.split(";")[0].trim()))
      .find(Boolean);
    if (match) return match;
  }

  return DEFAULT_LOCALE;
}

// Translator for the merchant who made this request.
export function getRequestT(request) {
  return getFixedT(getLocaleFromRequest(request));
}
