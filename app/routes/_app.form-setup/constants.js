// Shared between the frontend (app/routes/_app.form-setup) and the
// /api/form-settings route so both sides agree on option lists. The
// formSettings defaults themselves live in the Mongoose schema
// (app/models/app-settings.server.js), not here.

export const EU_COUNTRIES = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
];

export const AVAILABLE_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "nl", name: "Dutch" },
  { code: "it", name: "Italian" },
  { code: "es", name: "Spanish" },
  { code: "pl", name: "Polish" },
  { code: "sv", name: "Swedish" },
];

// An empty euCountries array means "all" — resolve it to the explicit list so
// the UI always shows a concrete selection.
//
// Also backfills array fields that were added to the schema after some shops
// already had a saved formSettings document — Mongoose only applies schema
// defaults to paths missing from brand-new documents, not to those absent
// from documents that already existed in the DB, so older shops can come
// back from the DB with these as `undefined`.
export function resolveFormSettings(settings) {
  return {
    ...settings,
    euCountries:
      settings.euCountries.length > 0 ? settings.euCountries : EU_COUNTRIES.map((c) => c.code),
    reasonField: {
      ...settings.reasonField,
      options: settings.reasonField.options ?? [],
    },
    automation: {
      ...settings.automation,
      beforeShipTags: settings.automation.beforeShipTags ?? [],
      afterDeliveryTags: settings.automation.afterDeliveryTags ?? [],
    },
  };
}
