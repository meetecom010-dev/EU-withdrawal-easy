import mongoose from "mongoose";
import connectDB from "../db.server";
import WithdrawalRequest from "../models/withdrawal-request.server";
import { requestTotal } from "../routes/_app.withdrawal-requests/constants";

const STATUSES = ["pending", "approved", "rejected"];
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Strips a WithdrawalRequest document down to a plain, network-safe object.
export function serializeWithdrawalRequest(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(obj._id),
    orderId: obj.orderId,
    orderName: obj.orderName,
    customerName: obj.customerName,
    customerEmail: obj.customerEmail,
    countryCode: obj.countryCode,
    locale: obj.locale ?? "",
    shippingAddress: obj.shippingAddress,
    reason: obj.reason,
    items: obj.items,
    orderLineCount: obj.orderLineCount,
    status: obj.status,
    submittedAt: obj.submittedAt,
    decidedAt: obj.decidedAt,
    notes: obj.notes ?? [],
    tags: obj.tags ?? [],
    automation: obj.automation ?? null,
  };
}

// Thrown when an order already has an open request. The submission route turns
// this into a 409 the extension can render, rather than a generic failure.
export class DuplicateWithdrawalRequestError extends Error {
  constructor(orderId) {
    super(`A withdrawal request for order ${orderId} is already open`);
    this.name = "DuplicateWithdrawalRequestError";
    this.orderId = orderId;
  }
}

export async function createWithdrawalRequest(shop, details) {
  await connectDB();
  try {
    const doc = await WithdrawalRequest.create({ shop, ...details });
    return serializeWithdrawalRequest(doc);
  } catch (error) {
    // The partial unique index on (shop, orderId) for pending requests is the
    // real guard — checking first and then inserting would still let two
    // concurrent submissions through.
    if (error?.code === 11000) {
      throw new DuplicateWithdrawalRequestError(details.orderId);
    }
    throw error;
  }
}

// The open request for an order, if there is one. Used by the eligibility
// endpoint so the form can tell a returning customer their request is already
// in rather than letting them submit into a 409.
export async function findOpenWithdrawalRequest(shop, orderId) {
  await connectDB();
  const doc = await WithdrawalRequest.findOne({ shop, orderId, status: "pending" });
  return doc ? serializeWithdrawalRequest(doc) : null;
}

export async function listWithdrawalRequests(shop) {
  await connectDB();
  const docs = await WithdrawalRequest.find({ shop }).sort({ submittedAt: -1 });
  return docs.map(serializeWithdrawalRequest);
}

export async function getWithdrawalRequestById(shop, id) {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  const doc = await WithdrawalRequest.findOne({ shop, _id: id });
  return doc ? serializeWithdrawalRequest(doc) : null;
}

export async function updateWithdrawalRequestStatus(shop, id, status) {
  if (!STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  if (!mongoose.isValidObjectId(id)) return null;

  await connectDB();
  const doc = await WithdrawalRequest.findOneAndUpdate(
    { shop, _id: id },
    { $set: { status, decidedAt: new Date() } },
    { new: true, runValidators: true },
  );
  return doc ? serializeWithdrawalRequest(doc) : null;
}

export async function addWithdrawalRequestNote(shop, id, body) {
  const trimmed = body?.trim();
  if (!trimmed) {
    throw new Error("Note body is required");
  }
  if (!mongoose.isValidObjectId(id)) return null;

  await connectDB();
  const doc = await WithdrawalRequest.findOneAndUpdate(
    { shop, _id: id },
    { $push: { notes: { $each: [{ body: trimmed }], $position: 0 } } },
    { new: true, runValidators: true },
  );
  return doc ? serializeWithdrawalRequest(doc) : null;
}

// Sums pending requests' totals per currency and returns the largest group —
// there's no cross-currency conversion available, so a shop with pending
// requests in more than one currency only sees its biggest-exposure currency
// here rather than a meaningless mixed-currency sum.
function sumRevenueAtRisk(pendingRequests) {
  const totalsByCurrency = new Map();
  for (const request of pendingRequests) {
    const total = requestTotal(request.items);
    if (!total) continue;
    totalsByCurrency.set(
      total.currencyCode,
      (totalsByCurrency.get(total.currencyCode) ?? 0) + total.amount,
    );
  }

  let best = null;
  for (const [currencyCode, amount] of totalsByCurrency) {
    if (!best || amount > best.amount) best = { amount, currencyCode };
  }
  return best;
}

// Dashboard summary tiles (app/routes/_app._index, Home, served at "/"). No Shopify order data is
// fetched anywhere in this app (no read_orders scope), so there's no
// denominator for a true "% of orders withdrawn" rate — approvalRate is the
// share of *decided* requests that were approved instead.
export async function getDashboardStats(shop) {
  await connectDB();
  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    openRequests,
    approvedLast30,
    approvedCount,
    rejectedCount,
    pendingDocs,
    submittedToday,
    submittedThisMonth,
  ] = await Promise.all([
    WithdrawalRequest.countDocuments({ shop, status: "pending" }),
    WithdrawalRequest.countDocuments({
      shop,
      status: "approved",
      decidedAt: { $gte: thirtyDaysAgo },
    }),
    WithdrawalRequest.countDocuments({ shop, status: "approved" }),
    WithdrawalRequest.countDocuments({ shop, status: "rejected" }),
    WithdrawalRequest.find({ shop, status: "pending" }),
    WithdrawalRequest.countDocuments({ shop, submittedAt: { $gte: startOfToday } }),
    WithdrawalRequest.countDocuments({ shop, submittedAt: { $gte: startOfMonth } }),
  ]);

  const decidedCount = approvedCount + rejectedCount;
  const approvalRate =
    decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 1000) / 10 : null;

  return {
    openRequests,
    approvedLast30,
    approvalRate,
    revenueAtRisk: sumRevenueAtRisk(pendingDocs.map(serializeWithdrawalRequest)),
    submittedToday,
    submittedThisMonth,
    closedRequests: decidedCount,
  };
}
