// Free webmail domains can't be domain-authenticated (nobody but the
// provider controls their DNS), so Brevo always substitutes its own
// brevosend.com as the sending domain for senders/domains on this list —
// there's no fix short of a real, owned domain. Shared between the
// sender-email field warning and the domain-authentication field's
// rejection, so the list only lives in one place.
export const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "aol.com",
  "protonmail.com",
  "mail.com",
  "gmx.com",
]);

// Accepts either a bare domain ("gmail.com") or an "email@domain" string.
export function isFreeEmailDomain(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  const domain = raw.includes("@") ? raw.split("@")[1] : raw;
  return Boolean(domain && FREE_EMAIL_DOMAINS.has(domain));
}
