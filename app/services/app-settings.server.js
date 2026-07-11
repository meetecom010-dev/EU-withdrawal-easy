import connectDB from "../db.server";
import AppSettings from "../models/app-settings.server";
import { resolveFormSettings } from "../routes/_app.form-setup/constants";
import { validateFormSettings } from "../routes/_app.form-setup/validation";

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
  const formSettings = doc.formSettings.toObject
    ? doc.formSettings.toObject()
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
