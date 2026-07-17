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
    isActive: { type: Boolean, default: true },
    installedAt: { type: Date, default: Date.now },
    uninstalledAt: { type: Date, default: null },
    onboardingCompleted: { type: Boolean, default: false },
    dpaAccepted: { type: Boolean, default: false },
    orderStatusBlockAdded: { type: Boolean, default: false },
    plan: { type: planSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export default mongoose.models.Shop ?? mongoose.model("Shop", shopSchema);
