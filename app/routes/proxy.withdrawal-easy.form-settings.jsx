import { authenticate } from "../shopify.server";
import connectDB from "../db.server";
import AppSettings from "../models/app-settings.server";
import { serializeFormSettings } from "../services/app-settings.server";
import { resolveLabelsForLocale } from "./_app.form-setup/constants";

// GET /apps/withdrawl-easy/form-settings -> the withdrawal form config for the
// storefront theme app extension (extensions/withdrawal-theme-block).
// Mirrors app/routes/api/public-form-settings.jsx (used by the order-status
// extension) but is reached via Shopify's App Proxy instead of a
// customer-account session token — there is no such token on a plain
// storefront page. App Proxy requests are HMAC-signed by Shopify and same
// -origin from the browser's perspective, so no CORS handling is needed here.
async function handleRequest(request) {
  const { session } = await authenticate.public.appProxy(request);
  // No offline session for this shop (e.g. app not installed) — fail closed,
  // same as a disabled form, rather than surfacing a raw error on a
  // storefront page most visitors won't even know exists.
  if (!session) {
    return Response.json({ enabled: false });
  }
  const shop = session.shop;

  const locale = new URL(request.url).searchParams.get("locale") ?? "en";

  await connectDB();
  const doc = await AppSettings.findOne({ shop });
  const formSettings = doc && serializeFormSettings(doc);
  const isEnabled = Boolean(formSettings?.masterEnabled && formSettings.showOnStandalonePage);

  if (!isEnabled) {
    return Response.json({ enabled: false });
  }

  const { labels, reasonField } = resolveLabelsForLocale(formSettings, locale);

  return Response.json({
    enabled: true,
    labels,
    reasonField,
    euCountries: formSettings.euCountries,
  });
}

export const loader = ({ request }) => handleRequest(request);
