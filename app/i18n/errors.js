import { tDefault } from "./config";

// An error whose merchant-facing text comes from the translation files. The
// message is still the default-locale text, so logs, Slack alerts and any code
// that only reads `error.message` keep working; routes that know the
// merchant's locale re-translate it with translateError().
export class TranslatableError extends Error {
  constructor(key, values = {}) {
    super(tDefault(key, values));
    this.name = "TranslatableError";
    this.i18nKey = key;
    this.i18nValues = values;
  }
}

// Low-level failure codes (e.g. BrevoError.code) that deserve a friendlier
// message than the raw text, which names internals the merchant can't act on.
const ERROR_CODE_KEYS = {
  network_error: "errors.emailServiceUnavailable",
  not_configured: "errors.emailServiceNotConfigured",
  sender_not_found: "errors.senderIdMissing",
};

// The text to show a merchant for any caught error: its translation key when
// it has one, a known code's friendly message, or the raw message otherwise
// (typically Shopify or provider text that has no translation).
export function translateError(error, t) {
  if (error?.i18nKey) return t(error.i18nKey, error.i18nValues);
  const codeKey = ERROR_CODE_KEYS[error?.code];
  if (codeKey) return t(codeKey);
  return error?.message || t("errors.generic");
}

// Validation helpers return { key, values } descriptors instead of English
// strings, so the same rules run on the client and the server and each side
// translates them for its own locale.
export function message(key, values) {
  return values ? { key, values } : { key };
}

export function translateMessages(messages, t) {
  return Object.fromEntries(
    Object.entries(messages).map(([path, descriptor]) => [path, t(descriptor.key, descriptor.values)]),
  );
}

// First validation message as a throwable error, for server-side saves.
export function firstMessageError(messages) {
  const first = Object.values(messages)[0];
  return first ? new TranslatableError(first.key, first.values) : null;
}
