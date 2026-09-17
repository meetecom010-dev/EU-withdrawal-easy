import { authenticate } from "../../shopify.server";
import connectDB from "../../db.server";
import AppSettings from "../../models/app-settings.server";
import { serializeFormSettings } from "../../services/app-settings.server";
import { resolveLabelsForLocale } from "../_app.form-setup/constants";

// GET/OPTIONS /api/public-form-settings -> the withdrawal form config for the
// customer account order-status extension. Unlike /api/form-settings this
// isn't gated by admin auth — it's called from the storefront-facing
// extension, so it's verified via the extension's session token instead
// (authenticate.public.customerAccount) and only ever returns the subset of
// settings customers are meant to see (never automation/deadline config).
async function handleRequest(request) {
  const { sessionToken, cors } = await authenticate.public.customerAccount(request);
  // The extension passes the buyer's language so we can return the form copy
  // already resolved to their locale (English base ⊕ that locale's translation).
  const locale = new URL(request.url).searchParams.get("locale") ?? "en";
  // For customer account sessions `dest` is the bare shop domain (e.g.
  // "my-shop.myshopify.com"), not a full URL like it is for checkout
  // sessions — so it can't be parsed with `new URL()`.
  const shop = sessionToken.dest.replace(/^https?:\/\//, "");

  await connectDB();
  const doc = await AppSettings.findOne({ shop });
  const formSettings = doc && serializeFormSettings(doc);
  const isEnabled = Boolean(formSettings?.masterEnabled && formSettings.showOnOrderStatus);

  if (!isEnabled) {
    return cors(Response.json({ enabled: false }));
  }

  const { labels, reasonField } = resolveLabelsForLocale(formSettings, locale);

  return cors(
    Response.json({
      enabled: true,
      labels,
      reasonField,
      euCountries: formSettings.euCountries,
    }),
  );
}

export const loader = ({ request }) => handleRequest(request);
export const action = ({ request }) => handleRequest(request);
