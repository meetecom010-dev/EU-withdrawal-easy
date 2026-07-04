import mongoose from "mongoose";

const { Schema } = mongoose;

// Mirrors the fields the Shopify Session object needs to be reconstructed.
// `_id` holds Shopify's session id (e.g. "offline_my-shop.myshopify.com").
const sessionSchema = new Schema(
  {
    _id: { type: String, required: true },
    shop: { type: String, required: true, index: true },
    state: { type: String, required: true },
    isOnline: { type: Boolean, default: false },
    scope: { type: String, default: null },
    expires: { type: Date, default: null },
    accessToken: { type: String, default: "" },
    userId: { type: String, default: null },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    email: { type: String, default: null },
    accountOwner: { type: Boolean, default: false },
    locale: { type: String, default: null },
    collaborator: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    refreshToken: { type: String, default: null },
    refreshTokenExpires: { type: Date, default: null },
  },
  { versionKey: false, _id: false, timestamps: { createdAt: false, updatedAt: true } },
);

export default mongoose.models.Session ??
  mongoose.model("Session", sessionSchema);
