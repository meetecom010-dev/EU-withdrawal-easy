import connectDB from "../db.server";
import AppSettings from "../models/app-settings.server";
import { AVAILABLE_LANGUAGES, resolveFormSettings } from "../routes/_app.form-setup/constants";
import { validateFormSettings } from "../routes/_app.form-setup/validation";
import { validateEmailSettings } from "../routes/_app.email-templates/validation";
import {
  TEMPLATE_KEYS,
  resolveTemplate,
  diffOverride,
  hasTranslation,
  BASE_EMAIL_LOCALE,
} from "./email/registry";
import { defaultSenderEmail } from "./email/brevo.server";

// Returns the shop's AppSettings doc, creating a default one if it doesn't
// exist yet so callers always get a predictable shape.
export async function getOrCreateAppSettings(shop) {
  await connectDB();
  const doc = await AppSettings.findOneAndUpdate(
    { shop },
    { $setOnInsert: { shop } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc;
}

// Strips the mongoose document down to a plain, network-safe formSettings
// object, resolving "empty euCountries means all 27" along the way.
export function serializeFormSettings(doc) {
  // flattenMaps turns the `translations` Map (and its inner labels Map) into
  // plain objects so the frontend and resolver work with normal objects.
  const formSettings = doc.formSettings.toObject
    ? doc.formSettings.toObject({ flattenMaps: true })
    : doc.formSettings;
  return resolveFormSettings(formSettings);
}

// Replaces the shop's stored formSettings wholesale with `formSettings` — the
// frontend always sends the complete object (see route.jsx's single `settings`
// state), so a full overwrite is safe and keeps this simple.
export async function saveFormSettings(shop, formSettings) {
  const errors = validateFormSettings(formSettings);
  const firstError = Object.values(errors)[0];
  if (firstError) {
    throw new Error(firstError);
  }

  await connectDB();
  const doc = await AppSettings.findOneAndUpdate(
    { shop },
    { $set: { formSettings } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return serializeFormSettings(doc);
}

// Reads the per-template override map, tolerating both the current shape
// (emailSettings.overrides) and a Mongoose Map, plus the legacy shape where
// each template was stored as a full object under its own key.
function readOverrides(stored) {
  if (stored.overrides) {
    return stored.overrides instanceof Map ? Object.fromEntries(stored.overrides) : stored.overrides;
  }
  // Legacy: full per-key objects (senderEmail/replyTo + customerConfirmation…)
  // reduced to a sparse override so old docs keep any real customisations.
  const legacy = {};
  for (const key of TEMPLATE_KEYS) {
    if (stored[key]) {
      const diff = diffOverride(key, stored[key]);
      if (Object.keys(diff).length) legacy[key] = diff;
    }
  }
  return legacy;
}

// Plain, network-safe email settings: the shop-level sender identity plus every
// template resolved to its effective values (registry default ⊕ override). Each
// template also reports whether it's `customized`, for the UI.
export function serializeEmailSettings(doc) {
  // flattenMaps so the overrides Map and each override's nested `translations`
  // Map come back as plain objects the resolver and UI can read directly.
  const stored = doc.emailSettings?.toObject
    ? doc.emailSettings.toObject({ flattenMaps: true })
    : doc.emailSettings ?? {};
  const overrides = readOverrides(stored);

  const sender = {
    fromName: stored.sender?.fromName ?? "",
    // Fall back to the legacy top-level replyTo if this is an old doc.
    replyTo: stored.sender?.replyTo ?? stored.replyTo ?? "",
    // The merchant's own From address and its Brevo verification state.
    fromEmail: stored.sender?.fromEmail ?? "",
    fromEmailStatus: stored.sender?.fromEmailStatus ?? "none",
  };

  // Every supported language gets an email tab too — same fixed set the form
  // builder offers (AVAILABLE_LANGUAGES), not a per-shop stored subset, so this
  // doesn't depend on the shop's formSettings.languages being freshly saved.
  const offered = AVAILABLE_LANGUAGES.map((lang) => lang.code);
  const extraLocales = offered.filter((code) => code !== BASE_EMAIL_LOCALE);

  const templates = {};
  for (const key of TEMPLATE_KEYS) {
    const override = overrides[key] ?? {};
    const overrideTranslations = override.translations ?? {};
    templates[key] = {
      ...resolveTemplate(key, override, BASE_EMAIL_LOCALE),
      customized: Object.keys(override).length > 0,
    };
    // Only customer templates that actually have a translation for an offered
    // language get a language tab; the merchant notification has none.
    const translations = {};
    for (const locale of extraLocales) {
      if (!hasTranslation(key, locale)) continue;
      const localeOverride = overrideTranslations[locale] ?? {};
      translations[locale] = {
        ...resolveTemplate(key, override, locale),
        customized: Object.keys(localeOverride).length > 0,
      };
    }
    if (Object.keys(translations).length) templates[key].translations = translations;
  }

  // The app's default sender, shown in the UI as the address used until a
  // merchant verifies their own.
  return { sender, templates, languages: offered, defaultFromEmail: defaultSenderEmail() };
}

// Persists the shop's email settings. The frontend sends the full effective
// object (sender + every template); we store only the sender plus a sparse
// override per template — anything equal to the current default is dropped, so
// resetting a template removes its override entirely.
export async function saveEmailSettings(shop, emailSettings) {
  const errors = validateEmailSettings(emailSettings);
  const firstError = Object.values(errors)[0];
  if (firstError) {
    throw new Error(firstError);
  }

  const sender = {
    fromName: emailSettings?.sender?.fromName?.trim() ?? "",
    replyTo: emailSettings?.sender?.replyTo?.trim() ?? "",
  };

  const overrides = {};
  for (const key of TEMPLATE_KEYS) {
    const effective = emailSettings?.templates?.[key];
    if (!effective) continue;
    const override = diffOverride(key, effective);
    if (Object.keys(override).length) overrides[key] = override;
  }

  // Only the fields the template editor owns are written — the custom-sender
  // verification fields (fromEmail/fromEmailStatus/brevoSenderId) are managed by
  // the separate verify flow, so a targeted $set leaves them untouched.
  await connectDB();
  const doc = await AppSettings.findOneAndUpdate(
    { shop },
    {
      $set: {
        "emailSettings.sender.fromName": sender.fromName,
        "emailSettings.sender.replyTo": sender.replyTo,
        "emailSettings.overrides": overrides,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return serializeEmailSettings(doc);
}
