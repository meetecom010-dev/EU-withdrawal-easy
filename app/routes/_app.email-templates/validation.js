// Central validation for the email settings object. Returns a flat map of
// dot-path -> error message for every field currently invalid; an empty object
// means it's safe to save. Shared by the client (route.jsx) and the server
// (services/app-settings.server) so the API can't be used to bypass it. Keys
// are the dot-paths the UI writes through `update()`, e.g. "sender.replyTo" or
// "templates.withdrawalApproved.subject".

import { SUBJECT_MAX, TEMPLATE_META } from "./constants";

// Deliberately loose — enough to catch a typo'd address, not a full RFC 5322
// parser.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailSettings(settings) {
  const errors = {};
  if (!settings) return errors;

  const replyTo = settings.sender?.replyTo?.trim() ?? "";
  if (replyTo && !EMAIL_RE.test(replyTo)) {
    errors["sender.replyTo"] = "Enter a valid email address.";
  }

  // Subject + body rules, applied identically to the English base and every
  // language translation a template carries.
  const checkCopy = (copy, at) => {
    const subject = copy.subject?.trim() ?? "";
    if (!subject) {
      errors[at("subject")] = "Enter a subject line.";
    } else if (subject.length > SUBJECT_MAX) {
      errors[at("subject")] = `Keep the subject under ${SUBJECT_MAX} characters.`;
    }
    if (!copy.bodyHtml?.trim()) {
      errors[at("bodyHtml")] = "The email body can't be empty.";
    }
  };

  const templates = settings.templates ?? {};
  for (const key of Object.keys(TEMPLATE_META)) {
    const template = templates[key];
    if (!template) continue;

    checkCopy(template, (field) => `templates.${key}.${field}`);

    for (const [locale, copy] of Object.entries(template.translations ?? {})) {
      checkCopy(copy, (field) => `templates.${key}.translations.${locale}.${field}`);
    }
  }

  return errors;
}
