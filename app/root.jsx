import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "react-router";
import skeletonStyles from "./styles/skeleton.css?url";
import { I18nProvider } from "./i18n/react";
import { getLocaleFromRequest, translationsFor } from "./i18n/server";

export const links = () => [{ rel: "stylesheet", href: skeletonStyles }];

// The merchant's admin language, read once per document load (see
// i18n/server.js), plus that one language's translations — the browser bundle
// only carries English. Covers every route, including the login page outside
// the embedded app shell.
export const loader = ({ request }) => {
  const locale = getLocaleFromRequest(request);
  return { locale, translations: translationsFor(locale) };
};

// Revalidation requests don't carry Shopify's `locale` param, and the locale
// can't change without a full reload anyway.
export const shouldRevalidate = () => false;

export default function App() {
  const { locale, translations } = useLoaderData();

  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <I18nProvider locale={locale} translations={translations}>
          <Outlet />
        </I18nProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
