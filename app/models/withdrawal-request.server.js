import mongoose from "mongoose";

const { Schema } = mongoose;

// A single withdrawn line item, snapshotted at submission time — order lines
// can change (fulfillment, edits), but a withdrawal request should keep
// showing exactly what the customer selected when they submitted it.
const withdrawalRequestItemSchema = new Schema(
  {
    // What the order status extension calls `line.id`: a
    // `gid://shopify/CartLine/…`. Shopify documents these as unstable, and
    // they're a different id space from `gid://shopify/LineItem/…`, so this is
    // a display/debug reference only — never a join key.
    lineId: { type: String, required: true },
    // `gid://shopify/ProductVariant/…`. The stable identifier, and what the
    // return automation matches on to find the fulfillment line item.
    variantId: { type: String, default: "" },
    title: { type: String, default: "" },
    // Variant title ("xs / red"), shown under the product name in the emails.
    variantTitle: { type: String, default: "" },
    sku: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
    price: {
      amount: { type: Number, default: null },
      currencyCode: { type: String, default: null },
    },
  },
  { _id: false },
);

// A staff note left on a request in the admin (RequestDetail's timeline
// composer) — internal only, never shown to the customer.
const withdrawalRequestNoteSchema = new Schema(
  {
    body: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// One fulfillment hold this app placed, recorded so it can be released again
// later. The hold ids matter: fulfillmentOrderReleaseHold releases *every*
// hold on the fulfillment order when holdIds is omitted, which would also drop
// holds the merchant or another app placed for unrelated reasons and ship an
// order that was meant to stay put.
const fulfillmentHoldSchema = new Schema(
  {
    fulfillmentOrderId: { type: String, required: true },
    holdIds: { type: [String], default: [] },
  },
  { _id: false },
);

// Everything the automation did, or tried to do, for this request. Kept on the
// request itself rather than a side collection so the admin detail page can
// show it without a second lookup, and so it's deleted with the request.
const automationLogEntrySchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    action: { type: String, required: true },
    outcome: { type: String, enum: ["success", "skipped", "failed"], required: true },
    message: { type: String, default: "" },
    // Shopify ids, user errors, anything worth having when debugging a
    // merchant's "why didn't this hold?" ticket.
    data: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

const automationStateSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "skipped"],
      default: "pending",
    },
    // Which half of the merchant's settings applied. Decided from the order's
    // fulfillment state at submission time, not from the clock: anything not
    // yet fulfilled is "before_ship", anything fulfilled — in transit included
    // — is "after_delivery", because a hold is impossible once the goods have
    // left and returnCreate accepts fulfilled-but-undelivered lines.
    branch: { type: String, enum: ["before_ship", "after_delivery"], default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    error: { type: String, default: null },

    holds: { type: [fulfillmentHoldSchema], default: [] },
    holdsReleasedAt: { type: Date, default: null },
    // Why the hold ended: "scheduled" (the release-n timer fired), "manual"
    // (staff approved/rejected in the admin), or "cancelled" (the order was
    // cancelled, which drops holds anyway).
    holdsReleasedBy: { type: String, default: null },

    // The configured fallback and when it comes due, so the job runner and the
    // admin agree on what's scheduled to happen next.
    fallbackAction: { type: String, default: null },
    fallbackDueAt: { type: Date, default: null },
    fallbackCompletedAt: { type: Date, default: null },

    returnId: { type: String, default: null },
    returnStatus: { type: String, default: null },
    returnCreatedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    tagsAdded: { type: [String], default: [] },
    notifiedAt: { type: Date, default: null },
    notificationChannels: { type: [String], default: [] },

    // Outcome of the two transactional emails sent on submission (customer
    // confirmation + merchant notification, via app/services/email). `sent`
    // false with a null error means it was skipped — no recipient, or Brevo
    // isn't configured — rather than failed.
    emails: {
      customer: {
        sent: { type: Boolean, default: false },
        at: { type: Date, default: null },
        messageId: { type: String, default: null },
        error: { type: String, default: null },
      },
      merchant: {
        sent: { type: Boolean, default: false },
        at: { type: Date, default: null },
        messageId: { type: String, default: null },
        error: { type: String, default: null },
      },
    },

    log: { type: [automationLogEntrySchema], default: [] },
  },
  { _id: false },
);

// One document per customer submission of the order-status withdrawal form
// (extensions/withdrawal-order-status). Mirrors the fields
// app/routes/_app.withdrawal-requests/component/RequestsTable.jsx expects.
const withdrawalRequestSchema = new Schema(
  {
    shop: { type: String, required: true, index: true },
    orderId: { type: String, required: true },
    orderName: { type: String, default: "" },
    customerName: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    countryCode: { type: String, default: "" },
    // The buyer's language at submission (e.g. "de"), read from the order status
    // extension's Localization API. Drives which language the customer emails are
    // sent in — falls back to English when blank or unsupported.
    locale: { type: String, default: "" },
    shippingAddress: { type: String, default: "" },
    reason: { type: String, default: "" },
    items: { type: [withdrawalRequestItemSchema], default: [] },
    // Total number of line items on the order when the request was
    // submitted — compared against items.length to tell a full withdrawal
    // (every line requested) from a partial one.
    orderLineCount: { type: Number, default: null },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    // Which surface the customer submitted from: the order status page
    // (order_status) or the storefront theme app extension's standalone/theme
    // page (standalone_page). Set server-side from the submitting route so it
    // can't be spoofed by the client. Defaults to order_status for requests
    // created before this field existed.
    source: {
      type: String,
      enum: ["order_status", "standalone_page"],
      default: "order_status",
    },
    submittedAt: { type: Date, default: Date.now },
    decidedAt: { type: Date, default: null },
    notes: { type: [withdrawalRequestNoteSchema], default: [] },
    // Free-form staff labels for filtering/organizing requests in the admin
    // (e.g. "priority", "chargeback-risk") — local to this app only, not
    // synced to the order's tags in Shopify admin.
    tags: { type: [String], default: [] },
    automation: { type: automationStateSchema, default: () => ({}) },
  },
  { timestamps: true },
);

// One open request per order. A customer refreshing the order status page and
// submitting twice would otherwise place two holds and create two returns for
// the same goods. Partial withdrawals still work — the customer picks their
// lines in a single request — and once staff approve or reject, the order is
// free to receive a new request for the remaining items.
//
// Note for existing installs: if a shop already has two pending requests for
// one order, Mongo won't build this index until the duplicates are resolved.
withdrawalRequestSchema.index(
  { shop: 1, orderId: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);

// Drives the job runner's "what's due?" scan (app/services/automation-jobs.server.js).
withdrawalRequestSchema.index({ shop: 1, "automation.fallbackDueAt": 1 });

export default mongoose.models.WithdrawalRequest ??
  mongoose.model("WithdrawalRequest", withdrawalRequestSchema);
