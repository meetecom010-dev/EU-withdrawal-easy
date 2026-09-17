import mongoose from "mongoose";

const { Schema } = mongoose;

// One document per order — a single, support-readable snapshot of the whole
// withdrawal lifecycle. Created (by upsert) the first time the withdrawal
// button is shown, then updated field-by-field as the customer interacts and
// the automation runs. The unique (shop, orderId) index guarantees there's
// never more than one document per order, so support can open exactly one
// record and read it top to bottom.
//
// This is a read model for support/debugging. The operational state the
// automation actually acts on still lives on WithdrawalRequest.automation
// (which holds to release, when the fallback is due, ...); the two are kept in
// sync by the orchestrator's single log() writer, so they can't drift.

// The common shape: did it happen, when, and did it fail. Every event field
// starts from this and adds its own extras.
const baseState = () => ({
  status: { type: String, default: null }, // "ok" | "success" | "skipped" | "failed"
  at: { type: Date, default: null },
  error: { type: String, default: null },
});

const emailStateSchema = new Schema(
  { ...baseState(), messageId: { type: String, default: null }, attempts: { type: Number, default: 0 } },
  { _id: false },
);

// A hold has two moments in its life, and one flat slot would let the release
// overwrite the applied record. Nested sub-states keep both.
const holdStateSchema = new Schema(
  {
    applied: { type: new Schema(baseState(), { _id: false }), default: () => ({}) },
    released: {
      type: new Schema({ ...baseState(), by: { type: String, default: null } }, { _id: false }),
      default: () => ({}),
    },
  },
  { _id: false },
);

const tagStateSchema = new Schema(
  { ...baseState(), tags: { type: [String], default: [] } },
  { _id: false },
);

const returnStateSchema = new Schema(
  { ...baseState(), returnId: { type: String, default: null } },
  { _id: false },
);

const cancelStateSchema = new Schema(
  { ...baseState(), refunded: { type: Boolean, default: false } },
  { _id: false },
);

const automationStateSchema = new Schema(
  { ...baseState(), branch: { type: String, default: null } },
  { _id: false },
);

const eventsSchema = new Schema(
  {
    // Pre-submission funnel.
    buttonViewed: { type: new Schema(baseState(), { _id: false }), default: () => ({}) },
    formOpened: { type: new Schema(baseState(), { _id: false }), default: () => ({}) },
    formSubmitted: { type: new Schema(baseState(), { _id: false }), default: () => ({}) },
    // Automation outcomes.
    customerEmail: { type: emailStateSchema, default: () => ({}) },
    merchantEmail: { type: emailStateSchema, default: () => ({}) },
    orderTagged: { type: tagStateSchema, default: () => ({}) },
    returnCreated: { type: returnStateSchema, default: () => ({}) },
    fulfillmentHold: { type: holdStateSchema, default: () => ({}) },
    orderCancelled: { type: cancelStateSchema, default: () => ({}) },
    automation: { type: automationStateSchema, default: () => ({}) },
  },
  { _id: false },
);

// The ordered-history safety net, kept inside the same document (so it's still
// one record per order). The snapshot above is last-write-wins; this preserves
// the sequence for the rare case the snapshot isn't enough. Bounded on write.
const logEntrySchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    type: { type: String, required: true },
    status: { type: String, default: null },
    message: { type: String, default: "" },
    error: { type: String, default: null },
    data: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

const formEventSchema = new Schema(
  {
    shop: { type: String, required: true },
    orderId: { type: String, required: true },
    // Filled in on submission — before that the document exists (from the
    // funnel) but no request does yet.
    withdrawalRequestId: { type: Schema.Types.ObjectId, ref: "WithdrawalRequest", default: null },
    sessionId: { type: String, default: null },
    events: { type: eventsSchema, default: () => ({}) },
    log: { type: [logEntrySchema], default: [] },
  },
  { timestamps: true },
);

// One document per order. Also the match key every upsert writes through, so
// concurrent button-view pings converge on the same record instead of racing
// to create duplicates.
formEventSchema.index({ shop: 1, orderId: 1 }, { unique: true });
// Look up the snapshot by the request it belongs to.
formEventSchema.index({ withdrawalRequestId: 1 });

export default mongoose.models.FormEvent ?? mongoose.model("FormEvent", formEventSchema);
