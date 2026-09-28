// The app's brand name. Deliberately not in the translation files: it's a
// proper noun and reads the same in every language. Translations that mention
// it use an {{appName}} placeholder filled with this value.
export const APP_NAME = "EU withdrawal easy";

// The EU minimum withdrawal period (Directive 2011/83/EU, Art. 9), in days.
// Merchant-facing copy quotes it through {{days}} placeholders.
export const LEGAL_MIN_WITHDRAWAL_DAYS = 14;

// The default for formSettings.deadline.daysAfterDelivery. The Mongoose schema
// reads it from here so the onboarding copy and the stored default can't drift.
export const DEFAULT_WITHDRAWAL_DAYS = LEGAL_MIN_WITHDRAWAL_DAYS;
