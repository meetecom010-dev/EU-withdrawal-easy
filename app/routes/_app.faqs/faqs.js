// The FAQs shown on /faqs, in display order. The copy lives in the admin
// translations under faqs.items.<id> — each answer is `paragraphs` plus an
// optional `bullets` list and `closing` paragraph, enough structure for the
// "why isn't the form showing" style answers without putting markup in the
// data.
//
// Everything there describes behaviour that exists in the app today: the
// deadline rules come from services/withdrawal-deadline.server.js, the
// automation choices from routes/_app.form-setup/constants.js, and the email
// list from services/email/registry.js. Change those and change these.

export const FAQ_IDS = [
  "what-it-does",
  "where-form-appears",
  "form-not-showing",
  "deadline",
  "transit-days",
  "countries-languages",
  "after-submit",
  "automation",
  "emails",
  "approve-reject",
];
