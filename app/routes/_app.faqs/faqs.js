// The FAQs shown on /faqs, grouped by topic in display order. The copy lives
// in the admin translations: group headings under faqs.groups.<id>, and each
// answer under faqs.items.<id> as `paragraphs` plus an optional `bullets` list
// and `closing` paragraph. That's enough structure for the "why isn't the form
// showing" style answers without putting markup in the data.
//
// Everything there describes behaviour that exists in the app today: the
// deadline rules come from services/withdrawal-deadline.server.js, the
// automation choices from routes/_app.form-setup/constants.js, the email list
// from services/email/registry.js, and the refund/return/lock rules from the
// request page (routes/_app.withdrawal-requests_.$id). Change those and change
// these.

export const FAQ_GROUPS = [
  {
    id: "gettingStarted",
    faqs: ["what-it-does", "where-form-appears", "form-not-showing"],
  },
  {
    id: "deadline",
    faqs: ["deadline", "transit-days", "split-shipments"],
  },
  {
    id: "requests",
    faqs: [
      "after-submit",
      "automation",
      "partial-withdrawal",
      "reason",
      "refund",
      "returns",
      "decision-lock",
    ],
  },
  {
    id: "emailsLanguages",
    faqs: ["emails", "countries-languages"],
  },
];

// Where an answer's "Go to …" link leads, for answers about a specific page.
// The label is faqs.actions.<labelKey>.
export const FAQ_ACTIONS = {
  "where-form-appears": { href: "/form-setup", labelKey: "goToSettings" },
  "form-not-showing": { href: "/form-setup", labelKey: "goToSettings" },
  deadline: { href: "/form-setup", labelKey: "goToSettings" },
  "transit-days": { href: "/form-setup", labelKey: "goToSettings" },
  "after-submit": { href: "/withdrawal-requests", labelKey: "goToRequests" },
  automation: { href: "/form-setup", labelKey: "goToSettings" },
  reason: { href: "/form-setup", labelKey: "goToSettings" },
  refund: { href: "/withdrawal-requests", labelKey: "goToRequests" },
  emails: { href: "/email-templates", labelKey: "goToNotifications" },
  "countries-languages": { href: "/form-setup", labelKey: "goToSettings" },
};
