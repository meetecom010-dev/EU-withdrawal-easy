import connectDB from "../db.server";
import WithdrawalRequest from "../models/withdrawal-request.server";
import { getOrCreateAppSettings, serializeFormSettings } from "./app-settings.server";
import { adminClientFor } from "./shopify/client.server";
import { addOrderTags, cancelOrderWithRefund, fetchOrderContext } from "./shopify/orders.server";
import {
  holdFulfillmentOrder,
  releaseFulfillmentHold,
} from "./shopify/fulfillment-holds.server";
import {
  buildReturnLineItems,
  createReturn,
  fetchReturnableLines,
} from "./shopify/returns.server";
import { fetchShopContact } from "./shopify/shop.server";
import { cancelJobsForRequest, scheduleJob } from "./automation-jobs.server";
import { notifyMerchantOfRequest } from "./notifications.server";
import { serializeWithdrawalRequest } from "./withdrawal-request.server";

const DAY_MS = 24 * 60 * 60 * 1000;

// Appends to the request's audit trail. Every branch below logs through this,
// including the ones that decide to do nothing — "why didn't this tag the
// order?" is answered by a `skipped` entry, not by absence of evidence.
function log(request, action, outcome, message, data = null) {
  request.automation.log.push({ at: new Date(), action, outcome, message, data });
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
    log(
      request,
      action,
      "failed",
      error.message,
      errorLogData(error),
    );
    return { ok: false, error };
  }
}

async function applyTags(admin, request, action, tags) {
  if (!tags || tags.length === 0) {
    log(request, action, "skipped", "No tags configured");
    return;
  }

  const outcome = await step(request, action, () =>
    addOrderTags(admin, request.orderId, tags),
  );
  if (outcome.ok) {
    request.automation.tagsAdded = [
      ...new Set([...request.automation.tagsAdded, ...outcome.result]),
    ];
    log(request, action, "success", `Tagged order with ${outcome.result.join(", ")}`, {
      tags: outcome.result,
    });
  }
}

// "Before the order ships": hold the fulfillment for staff review, then set up
// whatever the merchant chose to happen if nobody reviews it.
async function runBeforeShip(admin, request, automation) {
  if (automation.holdFulfillment) {
    const holdable = request.__orderContext.holdableFulfillmentOrders;

    if (holdable.length === 0) {
      log(request, "hold_fulfillment", "skipped", "No holdable fulfillment orders on this order");
    } else {
      for (const fulfillmentOrder of holdable) {
        const outcome = await step(request, "hold_fulfillment", () =>
          holdFulfillmentOrder(admin, {
            fulfillmentOrderId: fulfillmentOrder.id,
            requestId: request._id,
            reasonNotes: `Withdrawal request ${request.orderName || request.orderId} awaiting staff review`,
          }),
        );
        if (outcome.ok) {
          request.automation.holds.push({
            fulfillmentOrderId: outcome.result.fulfillmentOrderId,
            holdIds: outcome.result.holdIds,
          });
          log(request, "hold_fulfillment", "success", `Held ${fulfillmentOrder.id}`, {
            fulfillmentOrderId: outcome.result.fulfillmentOrderId,
            holdIds: outcome.result.holdIds,
          });
        }
      }
    }

    await scheduleFallback(admin, request, automation);
  } else {
    log(request, "hold_fulfillment", "skipped", "Hold for staff review is turned off");
  }

  if (automation.tagBeforeShip) {
    await applyTags(admin, request, "tag_before_ship", automation.beforeShipTags);
  } else {
    log(request, "tag_before_ship", "skipped", "Tagging before ship is turned off");
  }
}

// The "if no one reviews the request in time" choice. Only meaningful
// alongside a hold, which is also the only time the merchant can see the
// control in the settings UI.
async function scheduleFallback(admin, request, automation) {
  const fallback = automation.unshippedFallback;
  const days = Number(automation.unshippedFallbackDays);
  request.automation.fallbackAction = fallback;

  if (fallback === "hold") {
    log(request, "schedule_fallback", "skipped", "Fallback is to hold until staff act");
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
    log(request, "schedule_fallback", "failed", `Fallback ${fallback} has no valid day count`);
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
    `Scheduled ${type} for ${dueAt.toISOString()}`,
    { type, dueAt, jobId: job ? String(job._id) : null },
  );
}

export async function cancelForWithdrawal(admin, request, action) {
  const outcome = await step(request, action, () =>
    cancelOrderWithRefund(admin, request.orderId, {
      staffNote: `Cancelled by EU Withdrawly: customer withdrew from the purchase (request ${request._id}).`,
    }),
  );

  if (outcome.ok) {
    request.automation.cancelledAt = new Date();
    // Cancelling drops any holds Shopify was carrying, so the hold state is
    // closed out here rather than leaving a release scheduled for something
    // that no longer exists.
    request.automation.holdsReleasedAt = new Date();
    request.automation.holdsReleasedBy = "cancelled";
    log(request, action, "success", "Order cancelled and refunded", {
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
    await notifyForRequest(admin, request);
  }

  if (automation.tagAfterDelivery) {
    await applyTags(admin, request, "tag_after_delivery", automation.afterDeliveryTags);
  } else {
    log(request, "tag_after_delivery", "skipped", "Tagging after delivery is turned off");
  }
}

async function createReturnForRequest(admin, request) {
  const outcome = await step(request, "create_return", async () => {
    const returnable = await fetchReturnableLines(admin, request.orderId);

    const { returnLineItems, unreturnable } = buildReturnLineItems(request.items, returnable, {
      returnReasonNote: request.reason
        ? `Withdrawal request: ${request.reason}`
        : "Statutory withdrawal request",
    });

    if (returnLineItems.length === 0) {
      // Not a silent skip: the merchant configured "Create return" and no
      // return exists. Both sides of the failed match are attached so the
      // reason is visible without reproducing it.
      const error = new Error(
        "Create return: none of the submitted items matched a returnable line item on this order",
      );
      error.logData = {
        submitted: request.items.map((item) => ({
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
    // return they asked for couldn't be made.
    await notifyForRequest(admin, request);
    return;
  }

  const { created, unreturnable, returnLineItems } = outcome.result;

  request.automation.returnId = created?.id ?? null;
  request.automation.returnStatus = created?.status ?? null;
  request.automation.returnCreatedAt = new Date();

  log(request, "create_return", "success", `Created return ${created?.id}`, {
    returnId: created?.id ?? null,
    status: created?.status ?? null,
    lineItemCount: returnLineItems.length,
    // Recorded even on success: a partial withdrawal where some lines couldn't
    // be returned is exactly the case a merchant will need explained.
    unreturnable,
  });
}

async function notifyForRequest(admin, request) {
  const contact = await step(request, "notify_merchant", () => fetchShopContact(admin));
  const recipientEmail = contact.ok ? contact.result?.email : null;

  const { channels, emailError } = await notifyMerchantOfRequest(
    serializeWithdrawalRequest(request),
    { shop: request.shop, recipientEmail, appUrl: appUrl() },
  );

  request.automation.notifiedAt = new Date();
  request.automation.notificationChannels = channels;

  log(
    request,
    "notify_merchant",
    emailError ? "skipped" : "success",
    emailError
      ? `Recorded in app; email not sent (${emailError})`
      : `Notified merchant via ${channels.join(", ")}`,
    { channels, emailError },
  );
}

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
      throw new Error(`Order ${request.orderId} not found`);
    }
    if (orderContext.cancelledAt) {
      log(request, "resolve_branch", "skipped", "Order is already cancelled");
      request.automation.status = "skipped";
      request.automation.completedAt = new Date();
      await request.save();
      return serializeWithdrawalRequest(request);
    }

    // Stashed rather than threaded through every function signature — it's
    // read-only request-scoped context, dropped before the document is saved.
    request.__orderContext = orderContext;

    const branch = orderContext.isFulfilled ? "after_delivery" : "before_ship";
    request.automation.branch = branch;
    log(
      request,
      "resolve_branch",
      "success",
      branch === "before_ship"
        ? "Order not fulfilled yet — running the before-ship automation"
        : "Order already fulfilled — running the after-delivery automation",
      { displayFulfillmentStatus: orderContext.displayFulfillmentStatus },
    );

    if (branch === "before_ship") {
      await runBeforeShip(admin, request, automation);
    } else {
      await runAfterDelivery(admin, request, automation);
    }

    // A step that failed logged itself; the run is only "completed" if none did.
    const failed = request.automation.log.some((entry) => entry.outcome === "failed");
    request.automation.status = failed ? "failed" : "completed";
    if (failed) {
      request.automation.error = "One or more automation steps failed — see the log";
    }
  } catch (error) {
    request.automation.status = "failed";
    request.automation.error = error.message;
    log(
      request,
      "run_automation",
      "failed",
      error.message,
      errorLogData(error),
    );
  }

  request.automation.completedAt = new Date();
  delete request.__orderContext;
  await request.save();
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
      `Request was already ${request.status} — scheduled ${job.type} not run`,
    );
    await request.save();
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
      throw new Error(request.automation.log.at(-1)?.message ?? "Scheduled cancel failed");
    }
  }

  request.automation.fallbackCompletedAt = new Date();
  await request.save();
}

/**
 * Releases only the holds this app placed, then records why. Shared by the
 * scheduled release and by staff deciding a request in the admin.
 */
export async function releaseHoldsForRequest(admin, request, releasedBy) {
  const holds = request.automation.holds ?? [];
  if (holds.length === 0) {
    log(request, "release_hold", "skipped", "No holds were placed for this request");
    return;
  }
  if (request.automation.holdsReleasedAt) {
    log(request, "release_hold", "skipped", "Holds were already released");
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
      log(request, "release_hold", "success", `Released hold on ${hold.fulfillmentOrderId}`, {
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
export async function handleManualDecision(shop, requestId) {
  await connectDB();
  const request = await WithdrawalRequest.findOne({ shop, _id: requestId });
  if (!request) return null;

  await cancelJobsForRequest(request._id);

  if ((request.automation.holds ?? []).length > 0 && !request.automation.holdsReleasedAt) {
    const admin = await adminClientFor(shop);
    await releaseHoldsForRequest(admin, request, "manual");
  }

  await request.save();
  return serializeWithdrawalRequest(request);
}
