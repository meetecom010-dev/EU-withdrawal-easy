import mongoose from "mongoose";

const { Schema } = mongoose;

const labelsSchema = new Schema(
  {
    step1Title: { type: String, default: "Withdraw from your purchase" },
    step1Description: {
      type: String,
      default:
        "You have the right to withdraw from this purchase within 14 days without giving any reason.",
    },
    itemSelectionHeading: { type: String, default: "Select the items you want to withdraw" },
    deliveredTitle: { type: String, default: "Withdraw from your delivered order" },
    deliveredDescription: {
      type: String,
      default:
        "Your order has been delivered. You can still withdraw from your purchase within 14 days of delivery.",
    },
    deliveredItemSelectionHeading: {
      type: String,
      default: "Select the delivered items you want to withdraw",
    },
    confirmHeading: { type: String, default: "Confirm your withdrawal" },
    confirmMessage: {
      type: String,
      default: "Please confirm that you want to withdraw from this purchase.",
    },
    deliveredConfirmMessage: {
      type: String,
      default: "Please confirm that you want to withdraw from this delivered order.",
    },
    declaration: {
      type: String,
      default: "I hereby withdraw from the contract for the purchase of the selected item(s).",
    },
    submittedTitle: { type: String, default: "Withdrawal request submitted" },
    submittedMessage: {
      type: String,
      default: "We've received your withdrawal request and will be in touch shortly.",
    },
    deliveredSubmittedTitle: { type: String, default: "Return request submitted" },
    deliveredSubmittedMessage: {
      type: String,
      default: "We've received your return request and will send further instructions by email.",
    },
    step1ButtonLabel: { type: String, default: "Continue" },
    confirmButtonLabel: { type: String, default: "Confirm withdrawal" },
  },
  { _id: false },
);

const automationSchema = new Schema(
  {
    // "Before the order ships" — hold fulfillment for staff review, with a
    // fallback if no one acts in time (see FALLBACK_OPTIONS in
    // AutomationCard.jsx: hold | cancel-now | release-n | cancel-n).
    holdFulfillment: { type: Boolean, default: false },
    unshippedFallback: { type: String, default: "hold" },
    unshippedFallbackDays: { type: Number, default: 3 },
    tagBeforeShip: { type: Boolean, default: false },
    beforeShipTags: { type: [String], default: [] },

    // "After delivery" — delivered orders can't be held from shipping (the
    // goods are already with the customer), so this is a simple action
    // choice instead of the hold+fallback pattern above.
    afterDeliveryAction: { type: String, default: "notify_only" },
    tagAfterDelivery: { type: Boolean, default: false },
    afterDeliveryTags: { type: [String], default: [] },
  },
  { _id: false },
);

const deadlineSchema = new Schema(
  {
    daysAfterDelivery: { type: Number, default: 14 },
    estimatedTransitDays: { type: Number, default: 0 },
  },
  { _id: false },
);

// Mirrors the shape app/routes/_app.form-setup works with 1:1 — see
// A per-locale translation of the customer-facing copy. Sparse: only the fields
// the merchant actually translated are stored — a blank falls back to the
// English base (formSettings.labels / reasonField) field-by-field. Keyed by
// language code inside `translations` below.
const translationSchema = new Schema(
  {
    labels: { type: Map, of: String, default: () => ({}) },
    reasonLabel: { type: String, default: "" },
    reasonOptions: { type: [String], default: [] },
  },
  { _id: false },
);

// resolveFormSettings in app/routes/_app.form-setup/constants.js, which
// resolves countryMode "all" to the full EU list on read.
const formSettingsSchema = new Schema(
  {
    masterEnabled: { type: Boolean, default: false },
    showOnOrderStatus: { type: Boolean, default: true },
    // Storefront theme app extension surface (extensions/withdrawal-theme-block)
    // — opt-in, unlike showOnOrderStatus, since it requires the merchant to also
    // add the app block in their theme editor before it does anything.
    showOnStandalonePage: { type: Boolean, default: false },
    // "all" = every EU country is eligible (euCountries is ignored and
    // resolved to the full list); "specific" = only the euCountries below.
    countryMode: { type: String, enum: ["all", "specific"], default: "all" },
    euCountries: { type: [String], default: [] },
    languages: { type: [String], default: ["en"] },
    reasonField: {
      enabled: { type: Boolean, default: true },
      label: { type: String, default: "Reason for return" },
      options: {
        type: [String],
        default: ["Changed my mind", "Wrong size", "Item arrived damaged", "Prefer not to say"],
      },
    },
    labels: { type: labelsSchema, default: () => ({}) },
    // Non-English translations, keyed by language code (e.g. "de"). English is
    // the base and lives in `labels`/`reasonField` above; `languages` lists the
    // locales offered (the admin tabs).
    translations: { type: Map, of: translationSchema, default: () => ({}) },
    automation: { type: automationSchema, default: () => ({}) },
    deadline: { type: deadlineSchema, default: () => ({}) },
  },
  { _id: false },
);

// A merchant's sparse override for one template — only the fields they've
// actually changed. An absent field means "use the current code default"
// (services/email/registry.js), so defaults keep improving for every shop that
// hasn't touched that field, and "reset to default" just drops the override.
// One language's sparse subject/body override, nested under a template override's
// `translations` map. English lives at the top level of emailOverrideSchema; any
// other offered language stores only what the merchant changed from that
// language's default translation (registry.js).
const emailTranslationOverrideSchema = new Schema(
  {
    subject: { type: String },
    bodyHtml: { type: String },
  },
  { _id: false, minimize: true },
);

const emailOverrideSchema = new Schema(
  {
    enabled: { type: Boolean },
    subject: { type: String },
    bodyHtml: { type: String },
    // Per-language overrides for the customer emails, keyed by language code.
    translations: { type: Map, of: emailTranslationOverrideSchema, default: undefined },
  },
  { _id: false, minimize: true },
);

// One DNS record Brevo wants added to authenticate a domain (Brevo-code, DKIM,
// or DMARC) — normalized from Brevo's keyed dns_records response into an array
// so the UI can just iterate and render a table.
const dnsRecordSchema = new Schema(
  {
    recordType: { type: String, default: "" }, // "brevo_code" | "dkim_record" | "dmarc_record"
    type: { type: String, default: "" }, // "TXT" | "CNAME"
    hostName: { type: String, default: "" },
    value: { type: String, default: "" },
    verified: { type: Boolean, default: false },
  },
  { _id: false },
);

// Shop-level email configuration: the sender identity shared by every email,
// plus a Map of per-template overrides keyed by the registry's template keys.
// Because it's a Map, adding a new template needs no schema change at all.
const emailSettingsSchema = new Schema(
  {
    sender: {
      fromName: { type: String, default: "" },
      replyTo: { type: String, default: "" },
      // A merchant's own From address. Only used once Brevo has verified it —
      // registered via the Senders API, confirmed with a one-time code.
      fromEmail: { type: String, default: "" },
      fromEmailStatus: {
        type: String,
        enum: ["none", "pending", "verified"],
        default: "none",
      },
      brevoSenderId: { type: Number, default: null },
    },
    // Domain-level authentication (SPF/DKIM/DMARC) — separate from `sender`
    // above and managed entirely by email-domain.server.js. Once a domain here
    // is verified, any sender address on it comes back active with no OTP.
    domain: {
      name: { type: String, default: "" },
      status: {
        type: String,
        enum: ["none", "pending", "verified"],
        default: "none",
      },
      dnsRecords: { type: [dnsRecordSchema], default: [] },
    },
    overrides: { type: Map, of: emailOverrideSchema, default: () => ({}) },
  },
  { _id: false },
);

// One document per shop, holding the withdrawal form configuration —
// separate from Shop (app/models/shop.server.js) so shop identity stays lean.
const appSettingsSchema = new Schema(
  {
    shop: { type: String, required: true, unique: true },
    formSettings: { type: formSettingsSchema, default: () => ({}) },
    emailSettings: { type: emailSettingsSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export default mongoose.models.AppSettings ?? mongoose.model("AppSettings", appSettingsSchema);
