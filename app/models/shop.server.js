import mongoose from "mongoose";

const { Schema } = mongoose;

// Shop details + partner pricing plan. One document per installed shop.
const planSchema = new Schema(
  {
    name: { type: String, default: "Free" },
    price: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    interval: {
      type: String,
      enum: ["monthly", "annual"],
      default: "monthly",
    },
    subscriptionId: { type: String, default: null },
    status: {
      type: String,
      enum: ["active", "trial", "cancelled"],
      default: "active",
    },
    trialEndsAt: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
  },
  { _id: false },
);

const shopSchema = new Schema(
  {
    shop: { type: String, required: true, unique: true },
    // The store's Shopify contact — name + email — synced from the Admin API.
    // Used as the default reply-to for the app's emails.
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    installedAt: { type: Date, default: Date.now },
    uninstalledAt: { type: Date, default: null },
    onboardingCompleted: { type: Boolean, default: false },
    dpaAccepted: { type: Boolean, default: false },
    orderStatusBlockAdded: { type: Boolean, default: false },
    // Manually confirmed by the merchant (see StandalonePageStatus.jsx) —
    // unlike orderStatusBlockAdded, there's no App Bridge API to poll a theme
    // app extension block's live placement the way there is for a checkout
    // UI extension's activations, so this is self-reported rather than synced.
    themeBlockAdded: { type: Boolean, default: false },
    plan: { type: planSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export default mongoose.models.Shop ?? mongoose.model("Shop", shopSchema);
