import { FUNNEL_FIELDS } from "./event-types";

// Pure builders that turn events into a single atomic Mongo update. No I/O, so
// they're unit-testable on their own. Everything uses targeted $set / $inc /
// $addToSet on leaf paths (never a parent object), which is what lets one
// order's funnel pings and its automation run update disjoint fields
// concurrently without clobbering each other.

const LOG_LIMIT = 200;

// { status, at, error } for a leaf path prefix. error is the failure message
// (or the data.error a step attached), else null.
function state(prefix, entry) {
  const failed = entry.outcome === "failed";
  return {
    [`${prefix}.status`]: entry.outcome,
    [`${prefix}.at`]: entry.at,
    [`${prefix}.error`]: failed ? (entry.data?.error ?? entry.message) : (entry.data?.error ?? null),
  };
}

function emailFrag(field, entry) {
  return {
    set: {
      ...state(`events.${field}`, entry),
      [`events.${field}.messageId`]: entry.data?.messageId ?? null,
    },
    // Counts every attempt, so a retried send reads as attempts: 2, not a
    // single overwrite.
    inc: { [`events.${field}.attempts`]: 1 },
  };
}

// Which automation log action projects onto which snapshot field. Actions not
// listed (resolve_branch, fetch_shop_contact, schedule_fallback,
// notify_merchant) still land in log[] — they're just internal steps with no
// dedicated snapshot slot.
const PROJECTORS = {
  customer_email: (e) => emailFrag("customerEmail", e),
  merchant_email: (e) => emailFrag("merchantEmail", e),
  hold_fulfillment: (e) => ({ set: state("events.fulfillmentHold.applied", e) }),
  release_hold: (e) => ({
    set: {
      ...state("events.fulfillmentHold.released", e),
      "events.fulfillmentHold.released.by": e.data?.releasedBy ?? null,
    },
  }),
  tag_before_ship: (e) => tagFrag(e),
  tag_after_delivery: (e) => tagFrag(e),
  create_return: (e) => ({
    set: { ...state("events.returnCreated", e), "events.returnCreated.returnId": e.data?.returnId ?? null },
  }),
  cancel_order_immediate: (e) => cancelFrag(e),
  cancel_order_scheduled: (e) => cancelFrag(e),
  automation_completed: (e) => automationFrag(e),
  run_automation: (e) => automationFrag(e),
};

function tagFrag(entry) {
  const tags = Array.isArray(entry.data?.tags) ? entry.data.tags : [];
  return {
    set: state("events.orderTagged", entry),
    // Union across both tagging branches rather than overwrite, so the field
    // ends up holding every tag that was added.
    addToSet: tags.length ? { "events.orderTagged.tags": { $each: tags } } : {},
  };
}

function cancelFrag(entry) {
  return {
    set: { ...state("events.orderCancelled", entry), "events.orderCancelled.refunded": entry.outcome === "success" },
  };
}

function automationFrag(entry) {
  return {
    set: { ...state("events.automation", entry), "events.automation.branch": entry.data?.branch ?? null },
  };
}

function toLogEntry(entry) {
  return {
    at: entry.at,
    type: entry.action,
    status: entry.outcome,
    message: entry.message,
    error: entry.outcome === "failed" ? entry.message : null,
    data: entry.data ?? null,
  };
}

/**
 * Reduces a run's buffered automation log entries into one atomic update:
 * projects each into its snapshot field and appends all of them to the bounded
 * log[]. Later entries win on $set collisions; $inc accumulates; $addToSet
 * merges — so repeated actions in one run compose correctly.
 */
export function buildAutomationUpdate(entries, { withdrawalRequestId } = {}) {
  const set = {};
  const inc = {};
  const addToSet = {};

  for (const entry of entries) {
    const projector = PROJECTORS[entry.action];
    if (!projector) continue;
    const frag = projector(entry);
    Object.assign(set, frag.set);
    for (const [path, amount] of Object.entries(frag.inc ?? {})) {
      inc[path] = (inc[path] ?? 0) + amount;
    }
    for (const [path, value] of Object.entries(frag.addToSet ?? {})) {
      addToSet[path] = addToSet[path]
        ? { $each: [...addToSet[path].$each, ...value.$each] }
        : value;
    }
  }

  if (withdrawalRequestId) set.withdrawalRequestId = withdrawalRequestId;

  const update = { $push: { log: { $each: entries.map(toLogEntry), $slice: -LOG_LIMIT } } };
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(inc).length) update.$inc = inc;
  if (Object.keys(addToSet).length) update.$addToSet = addToSet;
  return update;
}

/**
 * The update for a single funnel / form event (button viewed, form opened,
 * form submitted).
 */
export function buildFunnelUpdate({ type, status = "ok", at, error = null, message = "", sessionId, withdrawalRequestId }) {
  const field = FUNNEL_FIELDS[type];
  if (!field) throw new Error(`Unknown funnel event type: ${type}`);

  const when = at ?? new Date();
  const set = {
    [`events.${field}.status`]: status,
    [`events.${field}.at`]: when,
    [`events.${field}.error`]: error,
  };
  if (sessionId) set.sessionId = sessionId;
  if (withdrawalRequestId) set.withdrawalRequestId = withdrawalRequestId;

  return {
    $set: set,
    $push: {
      log: { $each: [{ at: when, type, status, message, error, data: null }], $slice: -LOG_LIMIT },
    },
  };
}
