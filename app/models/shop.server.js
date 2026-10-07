import mongoose from "mongoose";

const { Schema } = mongoose;

export const PLAN_STATUSES = ["none", "active", "trial", "cancelled"];

const planItemSchema = new Schema(
  {
    handle: { type: String, default: "" },
    description: { type: String, default: "" },
    priceType: { type: String, default: "" }, // "FlatRatePrice" | "TieredPrice"
    amount: { type: Number, default: null },
    currency: { type: String, default: null },
  },
  { _id: false },
);

// The shop's Shopify App Pricing subscription, mirrored by
// services/subscription.server.js from the Partner API or the Admin API.
// Shopify is the source of truth: these fields are only written from a
// Shopify response, never from the client. The one exception is handle on the
// Admin API path, which has no handle field: it's taken from the redirect's
// plan_handle once that redirect's charge_id is confirmed as this shop's
// active subscription.
const planSchema = new Schema(
  {
    // "none": no subscription yet (or never synced). "cancelled": the shop had
    // one and Shopify no longer returns it.
    status: { type: String, enum: PLAN_STATUSES, default: "none" },
    handle: { type: String, default: null },
    name: { type: String, default: null },
    price: { type: Number, default: null },
    currency: { type: String, default: null },
    interval: { type: String, enum: ["monthly", "annual"], default: null },
    // gid://shopify/AppSubscription/<chargeId>. chargeId is the numeric part,
    // the same ID Shopify shows on the merchant's app charges.
    subscriptionId: { type: String, default: null },
    chargeId: { type: String, default: null },
    // True for charges on development stores, which Shopify never bills.
    test: { type: Boolean, default: false },
    items: { type: [planItemSchema], default: [] },
    trialEndsAt: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtEndOfCycle: { type: Boolean, default: false },
    // A plan change the merchant made that starts at the next billing cycle.
    pendingHandle: { type: String, default: null },
    pendingInterval: { type: String, enum: ["monthly", "annual"], default: null },
    activatedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    // syncedAt moves only on a successful sync; syncAttemptedAt on every try,
    // so a failing Shopify call isn't retried on every page load.
    syncedAt: { type: Date, default: null },
    syncAttemptedAt: { type: Date, default: null },
    syncError: { type: String, default: null },
    // The plan_handle and charge_id Shopify appended to the redirect after the
    // last plan change, saved exactly as received, before they're checked.
    lastRedirect: {
      planHandle: { type: String, default: null },
      chargeId: { type: String, default: null },
      at: { type: Date, default: null },
    },
  },
  { _id: false },
);

// One entry per change in plan, status, or subscription. Capped in
// services/subscription.server.js.
const planHistoryEntrySchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    status: { type: String, enum: PLAN_STATUSES, required: true },
    handle: { type: String, default: null },
    price: { type: Number, default: null },
    currency: { type: String, default: null },
    interval: { type: String, default: null },
    subscriptionId: { type: String, default: null },
    chargeId: { type: String, default: null },
    source: { type: String, default: "" }, // "plan_redirect" | "app_load" | "uninstall"
  },
  { _id: false },
);

// Shop details + pricing plan. One document per installed shop.
const shopSchema = new Schema(
  {
    shop: { type: String, required: true, unique: true },
    // gid://shopify/Shop/<id>. The Partner API identifies shops by GID, not
    // by myshopify.com domain.
    shopGid: { type: String, default: null },
    // The store's Shopify contact — name + email — synced from the Admin API.
    // Used as the default reply-to for the app's emails.
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    installedAt: { type: Date, default: Date.now },
    uninstalledAt: { type: Date, default: null },
    onboardingCompleted: { type: Boolean, default: false },
    orderStatusBlockAdded: { type: Boolean, default: false },
    // Manually confirmed by the merchant (see StandalonePageStatus.jsx) —
    // unlike orderStatusBlockAdded, there's no App Bridge API to poll a theme
    // app extension block's live placement the way there is for a checkout
    // UI extension's activations, so this is self-reported rather than synced.
    themeBlockAdded: { type: Boolean, default: false },
    plan: { type: planSchema, default: () => ({}) },
    planHistory: { type: [planHistoryEntrySchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.models.Shop ?? mongoose.model("Shop", shopSchema);
