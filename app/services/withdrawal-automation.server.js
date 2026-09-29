import connectDB from "../db.server";
import { APP_NAME } from "../constants";
import { tDefault } from "../i18n/config";
import { message as msg } from "../i18n/errors";
import WithdrawalRequest from "../models/withdrawal-request.server";
import {
  getOrCreateAppSettings,
  serializeEmailSettings,
  serializeFormSettings,
} from "./app-settings.server";
import { adminClientFor } from "./shopify/client.server";
import {
  addOrderTags,
  cancelOrderWithRefund,
  fetchOrderContext,
  fetchUnshippedLines,
  removeOrderTags,
} from "./shopify/orders.server";
import {
  holdFulfillmentOrder,
  releaseFulfillmentHold,
} from "./shopify/fulfillment-holds.server";
import {
  buildReturnLineItems,
  createReturn,
  fetchReturnableLines,
  fetchReturnDetail,
  previewReturnProcess,
  processReturnWithRefund,
} from "./shopify/returns.server";
import { createWithdrawalRefund, previewWithdrawalRefund } from "./shopify/refunds.server";
import { fetchShopContact } from "./shopify/shop.server";
import { cancelJobsForRequest, scheduleJob } from "./automation-jobs.server";
import { sendWithdrawalEmails, sendCustomerRawEmail } from "./email/index.server";
import { recordAutomationEvents } from "./form-events/index.server";
import { serializeWithdrawalRequest } from "./withdrawal-request.server";

const DAY_MS = 24 * 60 * 60 * 1000;

// Appends to the request's audit trail. Every branch below logs through this,
// including the ones that decide to do nothing — "why didn't this tag the
// order?" is answered by a `skipped` entry, not by absence of evidence.
//
// The same entry is buffered for the formEvents stream (flushed once per run by
// flushEvents). Writing both from this one place is what keeps the embedded log
// and the event stream from ever disagreeing.
//
// `message` is either a msg() descriptor — a requestDetail.activity.messages.*
// key the admin renders in the merchant's language — or raw text with no
// translation (an error message from Shopify or the email provider).
function log(request, action, outcome, message, data = null) {
  const described = typeof message === "object" && message !== null;
  const entry = {
    at: new Date(),
    action,
    outcome,
    message: described
      ? tDefault(`requestDetail.activity.messages.${message.key}`, activityValues(message.values))
      : message,
    messageKey: described ? message.key : null,
    messageValues: described ? message.values ?? null : null,
    data,
  };
  request.automation.log.push(entry);
  (request.__events ??= []).push(entry);
}

// Flushes this run's buffered log entries into the formEvents collection as one
// batch. Never throws (recordAutomationEvents swallows) and clears the buffer so
// flows that save more than once don't double-write.
async function flushEvents(request) {
  const buffered = request.__events;
  if (!buffered?.length) return;
  request.__events = [];
  await recordAutomationEvents(request.shop, request.orderId, buffered, {
    withdrawalRequestId: request._id,
  });
}

// Values as they read in the default-locale `message`. The stored
// messageValues stay raw (tag arrays, ISO dates, amount + currency) so the
// admin can format them for the merchant's locale.
function activityValues(values) {
  if (!values) return values;
  const out = { ...values };
  if (Array.isArray(out.tags)) out.tags = out.tags.join(", ");
  if (out.currencyCode) out.amount = `${out.amount} ${out.currencyCode}`;
  return out;
}

// Pulls whatever diagnostic detail an error carries: Shopify user errors and
// GraphQL errors from ShopifyApiError, or the hand-attached `logData` a step
// uses to explain a failure the API itself never saw.
function errorLogData(error) {
  if (typeof error?.toLogData === "function") return error.toLogData();
  return error?.logData ?? null;
}

function appUrl() {
  // eslint-disable-next-line no-undef
  return process.env.SHOPIFY_APP_URL?.replace(/\/$/, "") ?? null;
}

// Runs one automation step, recording success or failure without letting a
// single failed Shopify call abandon the remaining steps. A shop whose hold
// fails should still get its tag.
async function step(request, action, fn) {
  try {
    const result = await fn();
    return { ok: true, result };
  } catch (error) {
    // A step can attach a translatable `activityMessage` for failures it
    // explains itself; anything else is raw Shopify/provider text.
    log(
      request,
      action,
      "failed",
      error.activityMessage ?? error.message,
      errorLogData(error),
    );
    return { ok: false, error };
  }
}

async function applyTags(admin, request, action, tags) {
  if (!tags || tags.length === 0) {
    log(request, action, "skipped", msg("noTags"));
    return;
  }

  const outcome = await step(request, action, () =>
    addOrderTags(admin, request.orderId, tags),
  );
  if (outcome.ok) {
    request.automation.tagsAdded = [
      ...new Set([...request.automation.tagsAdded, ...outcome.result]),
    ];
    log(request, action, "success", msg("tagged", { tags: outcome.result }), {
      tags: outcome.result,
    });
  }
}

// Records a hold Shopify accepted, so it can be released precisely later.
// Clearing the released markers matters when staff re-hold after a release:
// the state has to read as "held" again.
function recordHold(request, result, lineItems = null) {
  request.automation.holds.push({
    fulfillmentOrderId: result.fulfillmentOrderId,
    holdIds: result.holdIds,
  });
  request.automation.holdsReleasedAt = null;
  request.automation.holdsReleasedBy = null;
  log(request, "hold_fulfillment", "success", msg("held", { id: result.fulfillmentOrderId }), {
    fulfillmentOrderId: result.fulfillmentOrderId,
    holdIds: result.holdIds,
    lineItems,
  });
}

function holdNote(request, noteKey) {
  return tDefault(`requestDetail.shopifyNotes.${noteKey}`, {
    order: request.orderName || request.orderId,
  });
}

// Holds every open fulfillment order on the order: the whole-order hold used
// when nothing has shipped yet.
async function holdAllFulfillmentOrders(admin, request, holdable, noteKey) {
  if (holdable.length === 0) {
    log(request, "hold_fulfillment", "skipped", msg("noHoldableOrders"));
    return;
  }
  for (const fulfillmentOrder of holdable) {
    const outcome = await step(request, "hold_fulfillment", () =>
      holdFulfillmentOrder(admin, {
        fulfillmentOrderId: fulfillmentOrder.id,
        requestId: request._id,
        reasonNotes: holdNote(request, noteKey),
      }),
    );
    if (outcome.ok) recordHold(request, outcome.result);
  }
}

function itemWithQuantity(item, quantity) {
  return { lineId: item.lineId, variantId: item.variantId, title: item.title, quantity };
}

// Splits the withdrawn items into units that haven't shipped and units that
// have. Requested units are matched to unshipped ones first: a hold is
// reversible and costs the customer nothing, while a return makes them send a
// parcel back. Only what's left over counts as shipped (and goes to a return).
//
// Matching mirrors buildReturnLineItems: variant first (the only id the order
// status extension gives that means the same thing on both sides), then the
// LineItem id the storefront page submits.
//
// `holdsByFulfillmentOrder` covers only lines that can take a hold; units
// already on hold are still counted as unshipped, since they can't be returned.
export function splitWithdrawnItems(items, unshippedLines) {
  const available = new Map(
    unshippedLines.map((line) => [line.fulfillmentOrderLineItemId, line.remainingQuantity]),
  );
  const holdsByFulfillmentOrder = new Map();
  const unshippedItems = [];
  const shippedItems = [];

  for (const item of items) {
    const byVariant = item.variantId
      ? unshippedLines.filter((line) => line.variantId === item.variantId)
      : [];
    const candidates = byVariant.length
      ? byVariant
      : unshippedLines.filter((line) => item.lineId && line.lineItemId === item.lineId);
    const requested = Math.max(1, item.quantity ?? 1);
    let remaining = requested;

    for (const line of candidates) {
      if (remaining <= 0) break;
      const free = available.get(line.fulfillmentOrderLineItemId) ?? 0;
      const quantity = Math.min(remaining, free);
      if (quantity <= 0) continue;
      available.set(line.fulfillmentOrderLineItemId, free - quantity);
      if (line.holdable !== false) {
        const lines = holdsByFulfillmentOrder.get(line.fulfillmentOrderId) ?? [];
        lines.push({ id: line.fulfillmentOrderLineItemId, quantity });
        holdsByFulfillmentOrder.set(line.fulfillmentOrderId, lines);
      }
      remaining -= quantity;
    }

    if (remaining < requested) unshippedItems.push(itemWithQuantity(item, requested - remaining));
    if (remaining > 0) shippedItems.push(itemWithQuantity(item, remaining));
  }

  return { holdsByFulfillmentOrder, unshippedItems, shippedItems };
}

// Fetches what's still waiting to ship and splits the request against it.
// Null if Shopify couldn't be reached; the failure is logged under `action`.
async function splitRequestItems(admin, request, action) {
  const fetched = await step(request, action, () => fetchUnshippedLines(admin, request.orderId));
  return fetched.ok ? splitWithdrawnItems(request.items, fetched.result) : null;
}

// Holds only the withdrawn units that haven't shipped, leaving everything the
// customer is keeping free to ship. Returns whether anything was held.
async function holdUnshippedItems(admin, request, noteKey, split) {
  if (!split) return false;
  const { holdsByFulfillmentOrder } = split;
  if (holdsByFulfillmentOrder.size === 0) {
    log(request, "hold_fulfillment", "skipped", msg("noUnshippedItemsRequested"));
    return false;
  }

  let held = false;
  for (const [fulfillmentOrderId, lineItems] of holdsByFulfillmentOrder) {
    const outcome = await step(request, "hold_fulfillment", () =>
      holdFulfillmentOrder(admin, {
        fulfillmentOrderId,
        requestId: request._id,
        reasonNotes: holdNote(request, noteKey),
        lineItems,
      }),
    );
    if (outcome.ok) {
      recordHold(request, outcome.result, lineItems);
      held = true;
    }
  }
  return held;
}

// "Before the order ships": hold the fulfillment for staff review, then set up
// whatever the merchant chose to happen if nobody reviews it.
async function runBeforeShip(admin, request, automation) {
  if (automation.holdFulfillment) {
    await holdAllFulfillmentOrders(
      admin,
      request,
      request.__orderContext.holdableFulfillmentOrders,
      "holdAutomatic",
    );
    await scheduleFallback(admin, request, automation);
  } else {
    log(request, "hold_fulfillment", "skipped", msg("holdOff"));
  }

  if (automation.tagBeforeShip) {
    await applyTags(admin, request, "tag_before_ship", automation.beforeShipTags);
  } else {
    log(request, "tag_before_ship", "skipped", msg("tagBeforeShipOff"));
  }
}

// The "if no one reviews the request in time" choice. Only meaningful
// alongside a hold, which is also the only time the merchant can see the
// control in the settings UI.
//
// On a partly shipped order the cancel options fall back to keeping the hold:
// orderCancel takes the whole order, including goods the customer already has
// and isn't withdrawing from.
async function scheduleFallback(admin, request, automation, { partiallyShipped = false } = {}) {
  const fallback = automation.unshippedFallback;
  const days = Number(automation.unshippedFallbackDays);
  request.automation.fallbackAction = fallback;

  if (fallback === "hold") {
    log(request, "schedule_fallback", "skipped", msg("fallbackHold"));
    return;
  }

  if (partiallyShipped && fallback !== "release-n") {
    request.automation.fallbackAction = "hold";
    log(request, "schedule_fallback", "skipped", msg("fallbackCancelPartiallyShipped"), {
      fallback,
    });
    return;
  }

  if (fallback === "cancel-now") {
    // Cancelling immediately makes the hold redundant, but the hold is placed
    // first anyway: if the cancel fails, the order is still stopped rather
    // than quietly shipping.
    await cancelForWithdrawal(admin, request, "cancel_order_immediate");
    return;
  }

  if (!Number.isFinite(days) || days <= 0) {
    log(request, "schedule_fallback", "failed", msg("fallbackInvalidDays"), { fallback });
    return;
  }

  const dueAt = new Date(Date.now() + days * DAY_MS);
  const type = fallback === "release-n" ? "release_hold" : "cancel_order";
  const job = await scheduleJob({
    shop: request.shop,
    requestId: request._id,
    type,
    dueAt,
  });

  request.automation.fallbackDueAt = dueAt;
  log(
    request,
    "schedule_fallback",
    "success",
    msg(type === "release_hold" ? "scheduledRelease" : "scheduledCancel", {
      date: dueAt.toISOString(),
    }),
    { type, dueAt, jobId: job ? String(job._id) : null },
  );
}

export async function cancelForWithdrawal(admin, request, action) {
  const outcome = await step(request, action, () =>
    cancelOrderWithRefund(admin, request.orderId, {
      staffNote: tDefault("requestDetail.shopifyNotes.canceled", {
        appName: APP_NAME,
        id: String(request._id),
      }),
    }),
  );

  if (outcome.ok) {
    request.automation.cancelledAt = new Date();
    // Cancelling drops any holds Shopify was carrying, so the hold state is
    // closed out here rather than leaving a release scheduled for something
    // that no longer exists.
    request.automation.holdsReleasedAt = new Date();
    request.automation.holdsReleasedBy = "cancelled";
    log(request, action, "success", msg("canceled"), {
      jobId: outcome.result?.id ?? null,
    });
  }
}

// "After delivery" — and also anything in transit, since a hold is impossible
// once the goods have left and returnCreate accepts fulfilled lines.
async function runAfterDelivery(admin, request, automation) {
  if (automation.afterDeliveryAction === "create_return") {
    await createReturnForRequest(admin, request);
  } else {
    notifyForRequest(request);
  }

  if (automation.tagAfterDelivery) {
    await applyTags(admin, request, "tag_after_delivery", automation.afterDeliveryTags);
  } else {
    log(request, "tag_after_delivery", "skipped", msg("tagAfterDeliveryOff"));
  }
}

// Part of the order has shipped and part hasn't. Each half of the merchant's
// settings runs on its own share of the withdrawn items: units still waiting
// to ship are held (only those units, so the rest of the order keeps moving),
// and units already sent go to a return.
async function runPartiallyShipped(admin, request, automation) {
  // One split drives both halves, so the hold and the return never claim the
  // same unit. If it can't be fetched, nothing is held and the return falls
  // back to every withdrawn item (Shopify only accepts the shipped ones).
  const split = await splitRequestItems(admin, request, "hold_fulfillment");

  if (automation.holdFulfillment) {
    const held = await holdUnshippedItems(admin, request, "holdAutomatic", split);
    if (held) {
      await scheduleFallback(admin, request, automation, { partiallyShipped: true });
    }
  } else {
    log(request, "hold_fulfillment", "skipped", msg("holdOff"));
  }

  if (automation.afterDeliveryAction === "create_return") {
    await createReturnForRequest(admin, request, {
      items: split ? split.shippedItems : request.items,
      partiallyShipped: true,
    });
  } else {
    notifyForRequest(request);
  }

  // Both halves apply to this order, so both sets of tags do too.
  if (automation.tagBeforeShip) {
    await applyTags(admin, request, "tag_before_ship", automation.beforeShipTags);
  } else {
    log(request, "tag_before_ship", "skipped", msg("tagBeforeShipOff"));
  }
  if (automation.tagAfterDelivery) {
    await applyTags(admin, request, "tag_after_delivery", automation.afterDeliveryTags);
  } else {
    log(request, "tag_after_delivery", "skipped", msg("tagAfterDeliveryOff"));
  }
}

// `items` defaults to everything the customer withdrew; the partly shipped
// branch passes only what the hold didn't cover. There, finding nothing to
// return is expected (the customer only picked unshipped items), so it's a
// skip rather than a failure.
async function createReturnForRequest(
  admin,
  request,
  { items = request.items, partiallyShipped = false } = {},
) {
  if (items.length === 0) {
    log(request, "create_return", "skipped", msg("returnNothingShipped"));
    return;
  }

  const outcome = await step(request, "create_return", async () => {
    const returnable = await fetchReturnableLines(admin, request.orderId);

    const { returnLineItems, unreturnable } = buildReturnLineItems(items, returnable, {
      returnReasonNote: request.reason
        ? tDefault("requestDetail.shopifyNotes.returnReason", { reason: request.reason })
        : tDefault("requestDetail.shopifyNotes.returnReasonNone"),
    });

    if (returnLineItems.length === 0 && partiallyShipped) {
      return { skipped: true, unreturnable };
    }

    if (returnLineItems.length === 0) {
      // Not a silent skip: the merchant configured "Create return" and no
      // return exists. Both sides of the failed match are attached so the
      // reason is visible without reproducing it.
      const error = new Error(tDefault("requestDetail.activity.messages.returnNoMatch"));
      error.activityMessage = msg("returnNoMatch");
      error.logData = {
        submitted: items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          variantId: item.variantId || null,
          lineId: item.lineId,
        })),
        returnableOnOrder: returnable.available.map((candidate) => ({
          title: candidate.title,
          variantId: candidate.variantId,
          lineItemId: candidate.lineItemId,
          returnableQuantity: candidate.returnableQuantity,
        })),
        unreturnable,
      };
      throw error;
    }

    const created = await createReturn(admin, { orderId: request.orderId, returnLineItems });
    return { created, unreturnable, returnLineItems };
  });

  if (!outcome.ok) {
    // The merchant still needs to know a withdrawal came in, even though the
    // return they asked for couldn't be made. The notification email already
    // went out at submission; this records that fact against the fallback.
    notifyForRequest(request);
    return;
  }

  if (outcome.result.skipped) {
    log(request, "create_return", "skipped", msg("returnNothingShipped"), {
      unreturnable: outcome.result.unreturnable,
    });
    return;
  }

  const { created, unreturnable, returnLineItems } = outcome.result;

  request.automation.returnId = created?.id ?? null;
  request.automation.returnStatus = created?.status ?? null;
  request.automation.returnCreatedAt = new Date();

  log(request, "create_return", "success", msg("returnCreated"), {
    returnId: created?.id ?? null,
    status: created?.status ?? null,
    lineItemCount: returnLineItems.length,
    // Recorded even on success: a partial withdrawal where some lines couldn't
    // be returned is exactly the case a merchant will need explained.
    unreturnable,
  });
}

// The merchant notification email is sent for every submission by
// sendSubmissionEmails below, so the "notify only" branch (and the return
// fallback) don't send a second email — they record that the merchant was
// notified, referencing that send. The in-app record is always the request row
// itself, which exists regardless of email.
function notifyForRequest(request) {
  const merchant = request.automation.emails?.merchant;
  const channels = ["in_app"];
  if (merchant?.sent) channels.push("email");

  request.automation.notifiedAt = new Date();
  request.automation.notificationChannels = channels;

  log(
    request,
    "notify_merchant",
    "success",
    merchant?.sent
      ? msg("notifiedByEmail")
      : merchant?.error
        ? msg("notifiedEmailFailed", { error: merchant.error })
        : msg("notifiedInAppOnly"),
    { channels, emailError: merchant?.error ?? null },
  );
}

// Sends the customer confirmation and merchant notification once per
// submission, then records the outcome on the request and in the log. Uses the
// shop contact already fetched by the caller so it doesn't repeat the API call.
async function sendSubmissionEmails(request, shopContact) {
  // The merchant's saved template config (subject/heading/body/sender name/
  // reply-to, and the merchant-notification enable toggle) travels with the
  // send context so the emails go out exactly as configured in Email Templates.
  const appSettings = await getOrCreateAppSettings(request.shop);
  const result = await sendWithdrawalEmails(serializeWithdrawalRequest(request), {
    shopName: shopContact?.name ?? "",
    merchantEmail: shopContact?.email ?? "",
    appUrl: appUrl(),
    emailSettings: serializeEmailSettings(appSettings),
  });

  const now = new Date();
  request.automation.emails.customer = {
    sent: result.customer.sent,
    at: result.customer.sent ? now : null,
    messageId: result.customer.messageId,
    error: result.customer.error,
  };
  request.automation.emails.merchant = {
    sent: result.merchant.sent,
    at: result.merchant.sent ? now : null,
    messageId: result.merchant.messageId,
    error: result.merchant.error,
  };

  // Logged as two events, one per recipient, so the stream and admin timeline
  // show the customer confirmation and merchant notification separately — a
  // failed (non-null error) send is `failed`, a skip (no recipient / not
  // configured) is `skipped`.
  logEmailOutcome(request, "customer_email", result.customer);
  logEmailOutcome(request, "merchant_email", result.merchant);
}

function logEmailOutcome(request, action, outcome) {
  const status = outcome.error ? "failed" : outcome.sent ? "success" : "skipped";
  const message = outcome.sent
    ? msg("emailSent")
    : outcome.error
      ? msg("emailFailed", { error: outcome.error })
      : msg("emailNotSent");
  log(request, action, status, message, {
    sent: outcome.sent,
    messageId: outcome.messageId,
    error: outcome.error,
  });
}

const BRANCH_MESSAGES = {
  before_ship: "branchBeforeShip",
  partially_shipped: "branchPartiallyShipped",
  after_delivery: "branchAfterDelivery",
};

/**
 * Runs the merchant's configured automation for a freshly submitted request.
 *
 * Never throws: the customer's submission is already saved and acknowledged by
 * the time this runs, so an automation failure is recorded on the request for
 * staff to see rather than turned into an error the customer sees.
 */
export async function runWithdrawalAutomation(shop, requestId) {
  await connectDB();
  const request = await WithdrawalRequest.findOne({ shop, _id: requestId });
  if (!request) return null;

  const settings = serializeFormSettings(await getOrCreateAppSettings(shop));
  const automation = settings.automation ?? {};

  request.automation.status = "running";
  request.automation.startedAt = new Date();
  request.automation.error = null;

  try {
    const admin = await adminClientFor(shop);
    const orderContext = await fetchOrderContext(admin, request.orderId);

    if (!orderContext) {
      const error = new Error(
        tDefault("requestDetail.activity.messages.orderNotFound", { id: request.orderId }),
      );
      error.activityMessage = msg("orderNotFound", { id: request.orderId });
      throw error;
    }
    if (orderContext.cancelledAt) {
      log(request, "resolve_branch", "skipped", msg("alreadyCanceled"));
      request.automation.status = "skipped";
      request.automation.completedAt = new Date();
      await request.save();
      await flushEvents(request);
      return serializeWithdrawalRequest(request);
    }

    // Stashed rather than threaded through every function signature — it's
    // read-only request-scoped context, dropped before the document is saved.
    request.__orderContext = orderContext;

    const branch = orderContext.branch;
    request.automation.branch = branch;
    log(request, "resolve_branch", "success", msg(BRANCH_MESSAGES[branch]), {
      displayFulfillmentStatus: orderContext.displayFulfillmentStatus,
    });

    // Confirmation to the customer and notification to the merchant go out for
    // every submission, before the branch runs, so notify-only can reference
    // the merchant send instead of emailing again. Shop contact is fetched
    // once here (shop name + merchant recipient) and reused.
    const contact = await step(request, "fetch_shop_contact", () => fetchShopContact(admin));
    await sendSubmissionEmails(request, contact.ok ? contact.result : null);

    if (branch === "before_ship") {
      await runBeforeShip(admin, request, automation);
    } else if (branch === "partially_shipped") {
      await runPartiallyShipped(admin, request, automation);
    } else {
      await runAfterDelivery(admin, request, automation);
    }

    // A step that failed logged itself; the run is only "completed" if none
    // did. Failed emails are deliberately excluded — they're still recorded
    // (red) in the timeline for debugging, but a bounced notification must not
    // mark an automation "failed" when the hold, return, or tag all succeeded.
    const failed = request.automation.log.some(
      (entry) =>
        entry.outcome === "failed" &&
        entry.action !== "customer_email" &&
        entry.action !== "merchant_email",
    );
    request.automation.status = failed ? "failed" : "completed";
    if (failed) {
      request.automation.error = tDefault("requestDetail.activity.messages.runFailed");
    }
  } catch (error) {
    request.automation.status = "failed";
    request.automation.error = error.message;
    log(
      request,
      "run_automation",
      "failed",
      error.activityMessage ?? error.message,
      errorLogData(error),
    );
  }

  request.automation.completedAt = new Date();
  // A single closing event carrying the run's final verdict, so the stream has
  // an unambiguous end marker to query on.
  log(
    request,
    "automation_completed",
    request.automation.status === "completed" ? "success" : request.automation.status,
    request.automation.status === "completed"
      ? msg("runCompleted")
      : request.automation.status === "skipped"
        ? msg("runSkipped")
        : msg("runFailed"),
    { branch: request.automation.branch },
  );
  delete request.__orderContext;
  await request.save();
  await flushEvents(request);
  return serializeWithdrawalRequest(request);
}

/**
 * Runs one scheduled job from the queue. Throws on failure so the job runner
 * can retry it with backoff.
 */
export async function runScheduledAutomationJob(job) {
  await connectDB();
  const request = await WithdrawalRequest.findOne({ shop: job.shop, _id: job.requestId });
  if (!request) {
    // The request was deleted. Nothing to do, and retrying won't help.
    return;
  }

  // The guarantee that scheduled work never overrides a human. Staff approving
  // or rejecting also cancels outstanding jobs, but a job already claimed when
  // that happened would otherwise still run.
  if (request.status !== "pending") {
    log(
      request,
      job.type,
      "skipped",
      msg(request.status === "approved" ? "scheduledSkippedApproved" : "scheduledSkippedRejected"),
    );
    await request.save();
    await flushEvents(request);
    return;
  }

  const admin = await adminClientFor(job.shop);

  if (job.type === "release_hold") {
    await releaseHoldsForRequest(admin, request, "scheduled");
  } else if (job.type === "cancel_order") {
    await cancelForWithdrawal(admin, request, "cancel_order_scheduled");
    const failed = request.automation.log.at(-1)?.outcome === "failed";
    if (failed) {
      await request.save();
      await flushEvents(request);
      throw new Error(request.automation.log.at(-1)?.message ?? "Scheduled cancel failed");
    }
  }

  request.automation.fallbackCompletedAt = new Date();
  await request.save();
  await flushEvents(request);
}

/**
 * Releases only the holds this app placed, then records why. Shared by the
 * scheduled release and by staff deciding a request in the admin.
 */
export async function releaseHoldsForRequest(admin, request, releasedBy) {
  const holds = request.automation.holds ?? [];
  if (holds.length === 0) {
    log(request, "release_hold", "skipped", msg("noHoldsPlaced"));
    return;
  }
  if (request.automation.holdsReleasedAt) {
    log(request, "release_hold", "skipped", msg("holdsAlreadyReleased"));
    return;
  }

  let released = 0;
  for (const hold of holds) {
    const outcome = await step(request, "release_hold", () =>
      releaseFulfillmentHold(admin, {
        fulfillmentOrderId: hold.fulfillmentOrderId,
        holdIds: hold.holdIds,
        externalId: String(request._id),
      }),
    );
    if (outcome.ok) {
      released += 1;
      log(request, "release_hold", "success", msg("holdReleased", { id: hold.fulfillmentOrderId }), {
        fulfillmentOrderId: hold.fulfillmentOrderId,
        holdIds: hold.holdIds,
        releasedBy,
      });
    }
  }

  if (released > 0) {
    request.automation.holdsReleasedAt = new Date();
    request.automation.holdsReleasedBy = releasedBy;
  }
}

/**
 * Called when staff approve or reject a request in the admin. Retires anything
 * still scheduled and lets the order move again.
 */
export async function handleManualDecision(shop, requestId, { email } = {}) {
  await connectDB();
  const request = await WithdrawalRequest.findOne({ shop, _id: requestId });
  if (!request) return null;

  await cancelJobsForRequest(request._id);

  const needsHoldRelease =
    (request.automation.holds ?? []).length > 0 && !request.automation.holdsReleasedAt;
  const decided = request.status === "approved" || request.status === "rejected";

  if (needsHoldRelease) {
    const admin = await adminClientFor(shop);
    await releaseHoldsForRequest(admin, request, "manual");
  }

  // The decision email is composed and (optionally) edited by staff in the admin
  // decision modal, then passed in here as { send, subject, html }. We send that
  // exact content — never re-render a template — so what staff previewed is what
  // the customer receives.
  if (decided) {
    await sendDecisionEmailForRequest(request, shop, email);
  }

  await request.save();
  await flushEvents(request);
  return serializeWithdrawalRequest(request);
}

// Sends the staff-reviewed decision email to the customer and records the
// outcome on the request's automation log. Best-effort: a mail failure is
// logged, never thrown, so the decision itself still succeeds.
async function sendDecisionEmailForRequest(request, shop, email) {
  if (!email?.send) {
    log(request, "notify_customer", "skipped", msg("decisionSkipped"));
    return;
  }
  try {
    const appSettings = await getOrCreateAppSettings(shop);
    const contact = await fetchShopContact(await adminClientFor(shop));
    const result = await sendCustomerRawEmail(
      serializeWithdrawalRequest(request),
      { subject: email.subject, html: email.html },
      {
        shopName: contact?.name ?? "",
        merchantEmail: contact?.email ?? "",
        emailSettings: serializeEmailSettings(appSettings),
      },
    );
    log(
      request,
      "notify_customer",
      result.sent ? "success" : result.error ? "failed" : "skipped",
      result.sent
        ? msg("decisionSent")
        : result.error
          ? msg("decisionFailed", { error: result.error })
          : msg("decisionNotConfigured"),
      { emailError: result.error ?? null },
    );
  } catch (error) {
    log(request, "notify_customer", "failed", msg("decisionFailed", { error: error.message }), {
      emailError: error.message,
    });
  }
}

// ── Manual actions from the Request Details page ─────────────────────────────
// Staff-triggered equivalents of the automation steps. Each loads the request,
// runs the operation through the same `step`/`log` audit trail as the automatic
// path, saves, and returns the serialized request — so a manual hold, refund, or
// tag shows up in the timeline exactly like an automatic one.

async function runManualAction(shop, requestId, fn) {
  await connectDB();
  const request = await WithdrawalRequest.findOne({ shop, _id: requestId });
  if (!request) return null;
  const admin = await adminClientFor(shop);
  await fn(admin, request);
  await request.save();
  await flushEvents(request);
  return serializeWithdrawalRequest(request);
}

export async function placeHoldForRequest(shop, requestId) {
  return runManualAction(shop, requestId, async (admin, request) => {
    if ((request.automation.holds ?? []).length > 0 && !request.automation.holdsReleasedAt) {
      log(request, "hold_fulfillment", "skipped", msg("holdExists"));
      return;
    }
    const orderContext = await fetchOrderContext(admin, request.orderId);
    // On a partly shipped order, hold only the withdrawn units still waiting to
    // ship. Holding whole fulfillment orders would also stop items the customer
    // is keeping.
    if (orderContext?.branch === "partially_shipped") {
      const split = await splitRequestItems(admin, request, "hold_fulfillment");
      await holdUnshippedItems(admin, request, "holdManual", split);
      return;
    }
    await holdAllFulfillmentOrders(
      admin,
      request,
      orderContext?.holdableFulfillmentOrders ?? [],
      "holdManual",
    );
  });
}

export async function releaseHoldForRequest(shop, requestId) {
  return runManualAction(shop, requestId, (admin, request) =>
    releaseHoldsForRequest(admin, request, "manual"),
  );
}

export async function cancelOrderForRequest(shop, requestId) {
  return runManualAction(shop, requestId, (admin, request) =>
    cancelForWithdrawal(admin, request, "cancel_order_manual"),
  );
}

// A withdrawal covers the whole order when every line was requested — that's
// when the original standard delivery charge is refunded too (EU right of
// withdrawal). Unknown order line count (older requests) is treated as partial,
// so shipping is never refunded on a guess.
function isFullWithdrawal(request) {
  return Boolean(request.orderLineCount) && request.items.length >= request.orderLineCount;
}

// The open return this request created, with the units on it that haven't
// been processed yet. Empty once the return is closed (or if there isn't one):
// processed units are refunded already and simply stop being refundable.
async function openReturnLines(admin, request) {
  const returnId = request.automation.returnId;
  if (!returnId) return { name: null, lines: [] };
  const detail = await fetchReturnDetail(admin, returnId);
  if (!detail || detail.status !== "OPEN") return { name: detail?.name ?? null, lines: [] };
  return {
    name: detail.name,
    lines: detail.lines.filter((line) => line.unprocessedQuantity > 0),
  };
}

// The withdrawn units the plain Refund button covers: everything except what's
// waiting in the open return. Those are refunded by processing the return
// ("Process and refund"), which also closes it. Refunding them here would
// leave the return open for goods that were already paid back, and let the
// same unit be refunded twice.
export function itemsOutsideReturn(items, returnLines) {
  const left = new Map(returnLines.map((line) => [line.id, line.unprocessedQuantity]));
  const outside = [];
  let inReturn = 0;

  for (const item of items) {
    const byVariant = item.variantId
      ? returnLines.filter((line) => line.variantId === item.variantId)
      : [];
    const candidates = byVariant.length
      ? byVariant
      : returnLines.filter((line) => item.lineId && line.lineItemId === item.lineId);
    let remaining = Math.max(1, item.quantity ?? 1);

    for (const line of candidates) {
      const covered = Math.min(remaining, left.get(line.id) ?? 0);
      if (covered <= 0) continue;
      left.set(line.id, left.get(line.id) - covered);
      remaining -= covered;
      inReturn += covered;
    }
    if (remaining > 0) outside.push(itemWithQuantity(item, remaining));
  }

  return { items: outside, inReturn };
}

/**
 * The refund the Refund button would issue, for its confirmation dialog.
 * `items` ({ lineId, quantity }) is exactly what's refunded; `inReturn` counts
 * withdrawn units left out because the open return (`returnName`) covers them.
 */
export async function previewRefundForRequest(shop, requestId) {
  await connectDB();
  const request = await WithdrawalRequest.findOne({ shop, _id: requestId });
  if (!request) return null;
  const admin = await adminClientFor(shop);

  const openReturn = await openReturnLines(admin, request);
  const { items, inReturn } = itemsOutsideReturn(request.items, openReturn.lines);
  const fullWithdrawal = isFullWithdrawal(request);
  const preview = items.length
    ? await previewWithdrawalRefund(admin, request.orderId, {
        items,
        isFullWithdrawal: fullWithdrawal,
      })
    : { refundable: false, amount: 0, currencyCode: null, items: [] };

  // preview.items is what the refund actually covers: outside the open return
  // and still refundable in Shopify (already-refunded units drop out).
  return { ...preview, fullWithdrawal, inReturn, returnName: openReturn.name };
}

export async function refundForRequest(shop, requestId) {
  return runManualAction(shop, requestId, async (admin, request) => {
    const fullWithdrawal = isFullWithdrawal(request);
    const scoped = await step(request, "refund", () => openReturnLines(admin, request));
    if (!scoped.ok) return;
    const { items } = itemsOutsideReturn(request.items, scoped.result.lines);
    if (items.length === 0) {
      log(request, "refund", "skipped", msg("refundCoveredByReturn"));
      return;
    }
    const outcome = await step(request, "refund", () =>
      createWithdrawalRefund(admin, request.orderId, {
        items,
        isFullWithdrawal: fullWithdrawal,
        note: tDefault("requestDetail.shopifyNotes.refunded", {
          appName: APP_NAME,
          id: String(request._id),
        }),
      }),
    );
    if (outcome.ok) {
      log(
        request,
        "refund",
        "success",
        msg("refunded", {
          amount: outcome.result.amount,
          currencyCode: outcome.result.currencyCode ?? null,
        }),
        {
          refundId: outcome.result.refundId,
          amount: outcome.result.amount,
          currencyCode: outcome.result.currencyCode,
          includedShipping: fullWithdrawal,
        },
      );
    }
  });
}

/**
 * What "Process and refund" would do on this request's return: the lines still
 * to process and the refund Shopify suggests for them (plus the original
 * shipping on a full withdrawal, if it hasn't been refunded already).
 */
export async function previewReturnRefundForRequest(shop, requestId) {
  await connectDB();
  const request = await WithdrawalRequest.findOne({ shop, _id: requestId });
  if (!request) return null;
  if (!request.automation.returnId) return { processable: false, status: null, lines: [] };
  const admin = await adminClientFor(shop);
  const preview = await previewReturnProcess(admin, request.automation.returnId, {
    includeShipping: isFullWithdrawal(request),
  });
  // Transactions stay server-side; the dialog only needs the figures.
  // eslint-disable-next-line no-unused-vars -- dropped on purpose
  const { transactions, ...shown } = preview;
  return shown;
}

// Shopify's "Process and refund" for the return this request created: marks
// the returned units processed, refunds them to the original payment method
// and closes the return, in one step.
export async function processReturnForRequest(shop, requestId) {
  return runManualAction(shop, requestId, async (admin, request) => {
    const returnId = request.automation.returnId;
    if (!returnId) {
      log(request, "process_return", "skipped", msg("noReturn"));
      return;
    }
    const outcome = await step(request, "process_return", () =>
      processReturnWithRefund(admin, returnId, {
        includeShipping: isFullWithdrawal(request),
        note: tDefault("requestDetail.shopifyNotes.refunded", {
          appName: APP_NAME,
          id: String(request._id),
        }),
      }),
    );
    if (!outcome.ok) return;

    const { status, amount, currencyCode } = outcome.result;
    if (status) request.automation.returnStatus = status;
    log(
      request,
      "process_return",
      "success",
      msg("returnProcessed", { amount, currencyCode: currencyCode ?? null }),
      { returnId, status, amount, currencyCode },
    );
  });
}

// Returns only the withdrawn units that have shipped, the same set
// previewReturnForRequest showed staff in the confirmation dialog.
export async function createReturnForRequestManual(shop, requestId) {
  return runManualAction(shop, requestId, async (admin, request) => {
    const split = await splitRequestItems(admin, request, "create_return");
    if (!split) return;
    await createReturnForRequest(admin, request, {
      items: split.shippedItems,
      partiallyShipped: split.unshippedItems.length > 0,
    });
  });
}

/**
 * Exactly what "Create return" would put in the return, without creating it,
 * so the confirmation dialog lists only the units Shopify will take back. Uses
 * the same split and matching as createReturnForRequestManual.
 *
 * Each list holds { lineId, quantity } against the request's items:
 * `items` go in the return, `notShipped` haven't shipped yet (nothing to send
 * back), `notReturnable` shipped but can't be returned (e.g. already returned).
 */
export async function previewReturnForRequest(shop, requestId) {
  await connectDB();
  const request = await WithdrawalRequest.findOne({ shop, _id: requestId });
  if (!request) return null;
  const admin = await adminClientFor(shop);

  // Independent reads, so they run side by side.
  const [unshippedLines, returnable] = await Promise.all([
    fetchUnshippedLines(admin, request.orderId),
    fetchReturnableLines(admin, request.orderId),
  ]);
  const split = splitWithdrawnItems(request.items, unshippedLines);
  const { unreturnable } = buildReturnLineItems(split.shippedItems, returnable, {
    returnReasonNote: "",
  });
  // A missing shortfall means none of that item matched.
  const shortfalls = new Map(unreturnable.map((entry) => [entry.lineId, entry.shortfall]));

  const items = [];
  const notReturnable = [];
  for (const item of split.shippedItems) {
    const short = shortfalls.has(item.lineId)
      ? shortfalls.get(item.lineId) ?? item.quantity
      : 0;
    if (item.quantity > short) items.push({ lineId: item.lineId, quantity: item.quantity - short });
    if (short > 0) notReturnable.push({ lineId: item.lineId, quantity: short });
  }

  return {
    items,
    notShipped: split.unshippedItems.map(({ lineId, quantity }) => ({ lineId, quantity })),
    notReturnable,
  };
}


// Applies a staged batch of order tag adds/removes in one round trip — the
// detail page's save bar collects edits locally and sends the whole diff here
// on Save, rather than a request per click.
export async function syncOrderTagsForRequest(shop, requestId, { added = [], removed = [] }) {
  return runManualAction(shop, requestId, async (admin, request) => {
    if (removed.length) {
      const outcome = await step(request, "order_tag_remove", () =>
        removeOrderTags(admin, request.orderId, removed),
      );
      if (outcome.ok && outcome.result.length) {
        log(request, "order_tag_remove", "success", msg("tagsRemoved", { tags: outcome.result }), {
          tags: outcome.result,
        });
      }
    }
    if (added.length) {
      const outcome = await step(request, "order_tag_add", () =>
        addOrderTags(admin, request.orderId, added),
      );
      if (outcome.ok && outcome.result.length) {
        log(request, "order_tag_add", "success", msg("tagsAdded", { tags: outcome.result }), {
          tags: outcome.result,
        });
      }
    }
  });
}
