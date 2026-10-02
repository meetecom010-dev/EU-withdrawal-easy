// A small fixed-window rate limiter for the public (storefront / customer
// account) endpoints. In-memory is enough here: the app runs as a single
// process, and the goal is to stop scripted guessing (order number + email
// probing, mass submissions), not to be a precise quota. A restart simply
// resets the windows.

const buckets = new Map();
let lastSweep = Date.now();
const SWEEP_EVERY_MS = 60 * 1000;

function sweep(now) {
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Counts one hit against `key`. Returns true while the caller is within
 * `limit` hits per `windowMs`, false once they're over it.
 */
export function hit(key, { limit, windowMs }) {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

/** True only when every key is still within its limit (all keys are counted). */
export function hitAll(entries) {
  let allowed = true;
  for (const { key, limit, windowMs } of entries) {
    if (!hit(key, { limit, windowMs })) allowed = false;
  }
  return allowed;
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// Limits shared by the routes, so every surface is held to the same numbers.
export const LIMITS = {
  // Per order number or per email: enough for a customer who mistypes a few
  // times, far too few to enumerate orders.
  lookupPerIdentifier: { limit: 10, windowMs: FIFTEEN_MINUTES },
  // No shop-wide cap on purpose: one client could use it up and lock every
  // real customer of the store out of their legal right to withdraw.
  submitPerOrder: { limit: 10, windowMs: FIFTEEN_MINUTES },
  eventsPerCustomer: { limit: 60, windowMs: FIFTEEN_MINUTES },
};

export function rateLimitedBody() {
  return { error: "Too many attempts. Wait a few minutes and try again.", code: "rate_limited" };
}
