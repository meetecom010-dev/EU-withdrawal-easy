import mongoose from "mongoose";

const { Schema } = mongoose;

// Work the automation scheduled for later: releasing a fulfillment hold after
// N days, or the delayed cancel+refund. Kept in Mongo rather than an in-memory
// timer so a deploy, a crash, or a container that scales to zero doesn't lose
// a hold that was supposed to be released — the row stays due until something
// actually runs it.
//
// POST /api/internal-run-automations drains this (see
// app/services/automation-jobs.server.js). Claiming is a single atomic
// findOneAndUpdate, so two instances or two overlapping cron ticks can't run
// the same job twice.
const automationJobSchema = new Schema(
  {
    shop: { type: String, required: true, index: true },
    requestId: { type: Schema.Types.ObjectId, required: true, index: true },
    type: {
      type: String,
      enum: ["release_hold", "cancel_order"],
      required: true,
    },
    dueAt: { type: Date, required: true },
    status: {
      type: String,
      // "cancelled" is what staff deciding the request manually does to
      // outstanding work — the requirement that a scheduled release must not
      // fire on a request someone already handled.
      enum: ["pending", "running", "done", "failed", "cancelled"],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    lastError: { type: String, default: null },
    // Set when a worker claims the job. A job stuck in "running" past the
    // stale threshold is reclaimable — otherwise a worker killed mid-job would
    // strand it forever.
    claimedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// The claim query: pending work that's due, oldest first.
automationJobSchema.index({ status: 1, dueAt: 1 });

// One outstanding job of a given type per request — re-running the orchestrator
// after a retry shouldn't queue a second release for the same hold.
automationJobSchema.index(
  { requestId: 1, type: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "running"] } } },
);

export default mongoose.models.AutomationJob ??
  mongoose.model("AutomationJob", automationJobSchema);
