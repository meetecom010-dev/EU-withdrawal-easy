import connectDB from "../db.server";
import Shop from "../models/shop.server";
import { fetchShopGid } from "./shopify/shop.server";
import { fetchActiveSubscription, isPartnerApiConfigured } from "./shopify/partner-api.server";
import { fetchActiveAppSubscriptions } from "./shopify/app-subscriptions.server";
import { alertError } from "./slack/alert-error.server";

// Keeps plan + planHistory on the Shop document in step with the merchant's
// Shopify App Pricing subscription. Two sources, same result:
//   - the Partner API (Shopify's recommended source), when its env vars are set
//   - the Admin API's AppSubscription otherwise, which needs no extra setup
//
// Shopify App Pricing sends no webhooks, so a change made outside the plan
// page redirect is only noticed by asking again. An hour keeps the Partner API
// (4 requests per second per client) well clear of its limit across every
// shop opening the app.
const BACKGROUND_SYNC_INTERVAL_MS = 60 * 60 * 1000;
const PLAN_HISTORY_LIMIT = 50;

const INTERVALS = { EVERY_30_DAYS: "monthly", ANNUAL: "annual" };
const DAY_MS = 24 * 60 * 60 * 1000;

const EMPTY_PLAN_FIELDS = {
  handle: null,
  name: null,
  price: null,
  currency: null,
  interval: null,
  subscriptionId: null,
  chargeId: null,
  test: false,
  items: [],
  trialEndsAt: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtEndOfCycle: false,
  pendingHandle: null,
  pendingInterval: null,
};

function toDate(value) {
  return value ? new Date(value) : null;
}

function toAmount(value) {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function isLive(status) {
  return status === "active" || status === "trial";
}

function chargeIdOf(subscriptionId) {
  return subscriptionId ? subscriptionId.split("/").pop() : null;
}

function isNewSubscription(previous, subscriptionId) {
  return !isLive(previous?.status) || previous?.subscriptionId !== subscriptionId;
}

// The fields to store when Shopify reports no subscription. `previous` decides
// between "none" and "cancelled". Only a plan this module stored (syncedAt is
// set) counts as one that ended: documents from before the sync existed carry
// a default "active"/"Free" plan that was never real.
function planWithoutSubscription(previous, now) {
  const hadRealPlan = Boolean(previous?.syncedAt) && (isLive(previous.status) || previous.status === "cancelled");
  if (!hadRealPlan) return { ...EMPTY_PLAN_FIELDS, status: "none", activatedAt: null, cancelledAt: null };
  return {
    status: "cancelled",
    cancelAtEndOfCycle: false,
    pendingHandle: null,
    pendingInterval: null,
    cancelledAt: previous.status === "cancelled" ? previous.cancelledAt : now,
  };
}

// Partner API activeSubscription -> plan fields.
function planFromPartnerSubscription(subscription, previous, now) {
  if (!subscription) return planWithoutSubscription(previous, now);

  const items = (subscription.items ?? []).map((item) => ({
    handle: item.handle ?? "",
    description: item.description ?? "",
    priceType: item.price?.__typename ?? "",
    amount: toAmount(item.price?.amount),
    currency: item.price?.currency ?? null,
  }));
  const primary = items.find((item) => item.priceType === "FlatRatePrice") ?? items[0] ?? null;
  const trialEndsAt = toDate(subscription.trialEndsAt);
  const subscriptionId = subscription.legacySubscriptionId ?? null;

  return {
    status: trialEndsAt && trialEndsAt > now ? "trial" : "active",
    handle: primary?.handle || null,
    name: primary?.description || primary?.handle || null,
    price: primary?.amount ?? null,
    currency: primary?.currency ?? null,
    interval: INTERVALS[subscription.billingPeriod] ?? null,
    subscriptionId,
    chargeId: chargeIdOf(subscriptionId),
    items,
    trialEndsAt,
    currentPeriodStart: toDate(subscription.currentBillingCycle?.startTime),
    currentPeriodEnd: toDate(subscription.currentBillingCycle?.endTime),
    cancelAtEndOfCycle: Boolean(subscription.cancelAtEndOfCycle),
    pendingHandle: subscription.pendingUpdate?.items?.[0]?.handle ?? null,
    pendingInterval: INTERVALS[subscription.pendingUpdate?.billingPeriod] ?? null,
    activatedAt: isNewSubscription(previous, subscriptionId) ? now : previous.activatedAt ?? now,
    cancelledAt: null,
  };
}

// Admin API AppSubscription -> plan fields. The Admin API has no plan handle,
// so it comes from the redirect's plan_handle, and only when that redirect's
// charge_id matched this exact subscription. On later syncs of the same
// subscription the stored handle is kept.
function planFromAppSubscription(subscription, previous, now, redirectPlanHandle) {
  if (!subscription) return planWithoutSubscription(previous, now);

  const recurring = (subscription.lineItems ?? [])
    .map((line) => line.plan?.pricingDetails)
    .find((pricing) => pricing?.__typename === "AppRecurringPricing");
  const createdAt = toDate(subscription.createdAt);
  const trialEndsAt =
    createdAt && subscription.trialDays > 0 ? new Date(createdAt.getTime() + subscription.trialDays * DAY_MS) : null;
  const sameSubscription = previous?.subscriptionId === subscription.id;
  const handle = redirectPlanHandle ?? (sameSubscription ? previous.handle : null);
  const price = toAmount(recurring?.price?.amount);
  const currency = recurring?.price?.currencyCode ?? null;

  return {
    status: trialEndsAt && trialEndsAt > now ? "trial" : "active",
    handle,
    name: subscription.name || handle,
    price,
    currency,
    interval: INTERVALS[recurring?.interval] ?? null,
    subscriptionId: subscription.id,
    chargeId: chargeIdOf(subscription.id),
    test: Boolean(subscription.test),
    items: [
      {
        handle: handle ?? "",
        description: subscription.name ?? "",
        priceType: recurring ? "FlatRatePrice" : "",
        amount: price,
        currency,
      },
    ],
    trialEndsAt,
    currentPeriodEnd: toDate(subscription.currentPeriodEnd),
    activatedAt: isNewSubscription(previous, subscription.id) ? createdAt ?? now : previous.activatedAt ?? now,
    cancelledAt: null,
  };
}

function historyEntry(plan, source, now) {
  return {
    at: now,
    status: plan.status,
    handle: plan.handle ?? null,
    price: plan.price ?? null,
    currency: plan.currency ?? null,
    interval: plan.interval ?? null,
    subscriptionId: plan.subscriptionId ?? null,
    chargeId: plan.chargeId ?? null,
    source,
  };
}

function changed(previous, next) {
  return (
    previous?.status !== next.status ||
    (previous?.handle ?? null) !== (next.handle ?? null) ||
    (previous?.subscriptionId ?? null) !== (next.subscriptionId ?? null) ||
    (previous?.interval ?? null) !== (next.interval ?? null)
  );
}

function planSetPaths(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [`plan.${key}`, value]));
}

async function nextPlanFromPartnerApi({ admin, shopDoc, previous, now }) {
  let shopGid = shopDoc.shopGid;
  if (!shopGid) {
    shopGid = await fetchShopGid(admin);
    if (!shopGid) throw new Error("The Admin API returned no shop ID.");
  }
  const subscription = await fetchActiveSubscription(shopGid);
  return { next: planFromPartnerSubscription(subscription, previous, now), extra: { shopGid } };
}

async function nextPlanFromAdminApi({ admin, previous, now, redirect }) {
  const subscriptions = await fetchActiveAppSubscriptions(admin);
  if (redirect?.chargeId) {
    const subscriptionId = `gid://shopify/AppSubscription/${redirect.chargeId}`;
    const match = subscriptions.find((subscription) => subscription.id === subscriptionId);
    if (!match) {
      // Not this shop's active charge: an edited URL, or a plan that already
      // ended. The stored plan stays as it is.
      throw new Error(`charge_id ${redirect.chargeId} isn't an active subscription for this shop.`);
    }
    return { next: planFromAppSubscription(match, previous, now, redirect.planHandle || null), extra: {} };
  }
  // An app has at most one active subscription per shop. If an earlier redirect
  // check failed (say, a timeout), its saved plan_handle still applies once
  // its charge_id turns out to be this subscription.
  const subscription = subscriptions[0] ?? null;
  const lastRedirect = previous?.lastRedirect;
  const redirectHandle =
    subscription && lastRedirect?.chargeId === chargeIdOf(subscription.id) ? lastRedirect.planHandle || null : null;
  return { next: planFromAppSubscription(subscription, previous, now, redirectHandle), extra: {} };
}

// Asks Shopify what the shop is subscribed to and stores it. Returns the
// stored plan, or null when the sync failed (recorded on plan.syncError).
//
// `redirect` holds the plan_handle and charge_id Shopify appended after the
// merchant picked a plan. They're saved as-is to plan.lastRedirect right away,
// and the plan itself is only updated once Shopify confirms the charge.
export async function syncSubscription({ admin, shop, source, redirect = null }) {
  await connectDB();
  const now = new Date();
  const lastRedirect = redirect
    ? { "plan.lastRedirect": { planHandle: redirect.planHandle ?? null, chargeId: redirect.chargeId ?? null, at: now } }
    : {};
  const shopDoc = await Shop.findOneAndUpdate(
    { shop },
    { $set: { "plan.syncAttemptedAt": now, ...lastRedirect } },
    { new: true },
  );
  if (!shopDoc) return null;

  const previous = shopDoc.plan?.toObject?.() ?? shopDoc.plan ?? null;
  try {
    const { next, extra } = isPartnerApiConfigured()
      ? await nextPlanFromPartnerApi({ admin, shopDoc, previous, now })
      : await nextPlanFromAdminApi({ admin, previous, now, redirect });
    const merged = { ...previous, ...next };

    const update = {
      $set: { ...extra, ...planSetPaths(next), "plan.syncedAt": now, "plan.syncError": null },
    };
    if (changed(previous, merged)) {
      update.$push = {
        planHistory: { $each: [historyEntry(merged, source, now)], $slice: -PLAN_HISTORY_LIMIT },
      };
    }

    const saved = await Shop.findOneAndUpdate({ shop }, update, { new: true });
    return saved?.plan ?? null;
  } catch (error) {
    await Shop.updateOne({ shop }, { $set: { "plan.syncError": error.message } });
    await alertError({ context: "Subscription sync failed", error, shop, extra: { source } });
    return null;
  }
}

// For the app layout, when Shopify sends the merchant back from the plan page
// with ?plan_handle=...&charge_id=... (to whatever Welcome link the plan has,
// which is the app's Home by default). Awaited, so the new plan is stored
// before the page renders.
//
// The layout loader re-runs with the same URL on every revalidation (each
// save on that page), so the same redirect is checked at most once an hour,
// whether the first check passed or failed.
export async function recordPlanRedirect({ admin, shop, planHandle, chargeId }) {
  await connectDB();
  const shopDoc = await Shop.findOne({ shop }, { plan: 1 });
  const plan = shopDoc?.plan;
  const alreadyStored =
    chargeId && plan?.chargeId === chargeId && plan.handle === planHandle && isLive(plan.status);
  const recentlyChecked =
    plan?.lastRedirect?.chargeId === chargeId &&
    plan.lastRedirect.planHandle === planHandle &&
    plan.syncAttemptedAt > new Date(Date.now() - BACKGROUND_SYNC_INTERVAL_MS);
  if (alreadyStored || recentlyChecked) return plan;

  return syncSubscription({ admin, shop, source: "plan_redirect", redirect: { planHandle, chargeId } });
}

// For every other app load: starts a sync when the last attempt is over an
// hour old and doesn't wait for it. Claiming syncAttemptedAt first means a
// burst of page loads starts one sync, not one per request.
export async function refreshSubscriptionInBackground({ admin, shop }) {
  await connectDB();
  const cutoff = new Date(Date.now() - BACKGROUND_SYNC_INTERVAL_MS);
  const claimed = await Shop.findOneAndUpdate(
    { shop, $or: [{ "plan.syncAttemptedAt": null }, { "plan.syncAttemptedAt": { $lt: cutoff } }] },
    { $set: { "plan.syncAttemptedAt": new Date() } },
  );
  if (!claimed) return;
  syncSubscription({ admin, shop, source: "app_load" }).catch((error) =>
    console.error(`Background subscription sync failed for ${shop}:`, error),
  );
}

// Uninstalling ends every app subscription in Shopify, so the stored plan is
// marked cancelled right away instead of waiting for a sync that can't run
// (there's no session after uninstall). Clearing syncAttemptedAt makes the
// first app load after a reinstall sync straight away.
export async function markSubscriptionCancelled(shop) {
  await connectDB();
  const shopDoc = await Shop.findOne({ shop });
  if (!shopDoc) return;
  if (!isLive(shopDoc.plan?.status) || !shopDoc.plan?.syncedAt) {
    await Shop.updateOne({ shop }, { $set: { "plan.syncAttemptedAt": null } });
    return;
  }

  const now = new Date();
  const plan = { ...shopDoc.plan.toObject(), status: "cancelled", cancelAtEndOfCycle: false };
  await Shop.updateOne(
    { shop },
    {
      $set: {
        "plan.status": "cancelled",
        "plan.cancelledAt": now,
        "plan.cancelAtEndOfCycle": false,
        "plan.syncAttemptedAt": null,
      },
      $push: { planHistory: { $each: [historyEntry(plan, "uninstall", now)], $slice: -PLAN_HISTORY_LIMIT } },
    },
  );
}
