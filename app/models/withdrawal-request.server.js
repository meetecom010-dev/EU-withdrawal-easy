import mongoose from "mongoose";

const { Schema } = mongoose;

// A single withdrawn line item, snapshotted at submission time — order lines
// can change (fulfillment, edits), but a withdrawal request should keep
// showing exactly what the customer selected when they submitted it.
const withdrawalRequestItemSchema = new Schema(
  {
    lineId: { type: String, required: true },
    title: { type: String, default: "" },
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

// One document per customer submission of the order-status withdrawal form
// (extensions/order-status-hello). Mirrors the fields
// app/routes/_app.withdrawal-requests/component/RequestsTable.jsx expects.
const withdrawalRequestSchema = new Schema(
  {
    shop: { type: String, required: true, index: true },
    orderId: { type: String, required: true },
    orderName: { type: String, default: "" },
    customerName: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    countryCode: { type: String, default: "" },
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
    submittedAt: { type: Date, default: Date.now },
    decidedAt: { type: Date, default: null },
    notes: { type: [withdrawalRequestNoteSchema], default: [] },
    // Free-form staff labels for filtering/organizing requests in the admin
    // (e.g. "priority", "chargeback-risk") — local to this app only, not
    // synced to the order's tags in Shopify admin.
    tags: { type: [String], default: [] },
  },
  { timestamps: true },
);

export default mongoose.models.WithdrawalRequest ??
  mongoose.model("WithdrawalRequest", withdrawalRequestSchema);
