import connectDB from "../db.server";
import AutomationJob from "../models/automation-job.server";
import { alertError } from "./slack/alert-error.server";

// A job left "running" longer than this is assumed dead — the worker that
// claimed it was killed mid-flight — and becomes claimable again. Generous
// enough that a slow Shopify call isn't mistaken for a crash.
const STALE_CLAIM_MS = 10 * 60 * 1000;

// Enqueues work due later, or leaves an existing outstanding job alone. The
// partial unique index on (requestId, type) means a retried orchestrator run
// can't stack a second release for the same hold; catching the duplicate-key
// error is how that's absorbed.
export async function scheduleJob({ shop, requestId, type, dueAt }) {
  await connectDB();
  try {
    return await AutomationJob.create({ shop, requestId, type, dueAt });
  } catch (error) {
    if (error?.code === 11000) return null;
    throw error;
  }
}

// Staff deciding a request by hand cancels whatever was scheduled for it. This
// is the "don't release a hold on a request someone already processed"
// guarantee — the job is retired before it can ever come due.
export async function cancelJobsForRequest(requestId) {
  await connectDB();
  const result = await AutomationJob.updateMany(
    { requestId, status: { $in: ["pending", "running"] } },
    { $set: { status: "cancelled", completedAt: new Date() } },
  );
  return result.modifiedCount ?? 0;
}

// Atomically takes ownership of one due job. findOneAndUpdate is a single
// document operation, so two workers — two instances, or overlapping cron
// ticks — can never claim the same row.
async function claimNextDueJob(now) {
  return AutomationJob.findOneAndUpdate(
    {
      status: "pending",
      dueAt: { $lte: now },
    },
    {
      $set: { status: "running", claimedAt: now },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { dueAt: 1 } },
  );
}

// Returns jobs whose worker died mid-run to the pending pool.
async function reclaimStaleJobs(now) {
  const result = await AutomationJob.updateMany(
    { status: "running", claimedAt: { $lt: new Date(now.getTime() - STALE_CLAIM_MS) } },
    { $set: { status: "pending", claimedAt: null } },
  );
  return result.modifiedCount ?? 0;
}

async function finishJob(job, { ok, error }) {
  if (ok) {
    job.status = "done";
    job.completedAt = new Date();
    job.lastError = null;
  } else if (job.attempts >= job.maxAttempts) {
    // Out of retries. Left as "failed" rather than retried forever so it shows
    // up as something a human needs to look at instead of hammering Shopify.
    job.status = "failed";
    job.completedAt = new Date();
    job.lastError = error;
    alertError({
      context: "automation-job",
      error: new Error(error),
      shop: job.shop,
      extra: { type: job.type, requestId: job.requestId, attempts: job.attempts },
    }).catch(() => {});
  } else {
    // Exponential backoff, so a shop that's rate limited or briefly down isn't
    // retried immediately on the next cron tick.
    job.status = "pending";
    job.claimedAt = null;
    job.lastError = error;
    job.dueAt = new Date(Date.now() + Math.min(2 ** job.attempts, 60) * 60 * 1000);
  }
  await job.save();
}

/**
 * Drains due jobs, handing each to `runJob`. `limit` bounds how much one cron
 * tick does so a backlog can't stretch a single request past its timeout — the
 * next tick picks up where this one stopped.
 *
 * @param {(job: object) => Promise<void>} runJob
 */
export async function drainDueJobs(runJob, { limit = 25, now = new Date() } = {}) {
  await connectDB();
  const reclaimed = await reclaimStaleJobs(now);

  const summary = { reclaimed, processed: 0, succeeded: 0, failed: 0 };

  for (let i = 0; i < limit; i++) {
    const job = await claimNextDueJob(now);
    if (!job) break;

    summary.processed += 1;
    try {
      await runJob(job);
      await finishJob(job, { ok: true });
      summary.succeeded += 1;
    } catch (error) {
      await finishJob(job, { ok: false, error: error.message });
      summary.failed += 1;
    }
  }

  return summary;
}
