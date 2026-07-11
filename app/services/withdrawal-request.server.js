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
    shippingAddress: obj.shippingAddress,
    reason: obj.reason,
    items: obj.items,
    orderLineCount: obj.orderLineCount,
    status: obj.status,
    submittedAt: obj.submittedAt,
    decidedAt: obj.decidedAt,
    notes: obj.notes ?? [],
    tags: obj.tags ?? [],
  };
}

export async function createWithdrawalRequest(shop, details) {
  await connectDB();
  const doc = await WithdrawalRequest.create({ shop, ...details });
  return serializeWithdrawalRequest(doc);
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

export async function addWithdrawalRequestTag(shop, id, tag) {
  const trimmed = tag?.trim();
  if (!trimmed) {
    throw new Error("Tag is required");
  }
  if (!mongoose.isValidObjectId(id)) return null;

  await connectDB();
  const doc = await WithdrawalRequest.findOneAndUpdate(
    { shop, _id: id },
    { $addToSet: { tags: trimmed } },
    { new: true, runValidators: true },
  );
  return doc ? serializeWithdrawalRequest(doc) : null;
}

export async function removeWithdrawalRequestTag(shop, id, tag) {
  if (!mongoose.isValidObjectId(id)) return null;

  await connectDB();
  const doc = await WithdrawalRequest.findOneAndUpdate(
    { shop, _id: id },
    { $pull: { tags: tag } },
    { new: true },
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

// Dashboard summary tiles (app/routes/_app.home). No Shopify order data is
// fetched anywhere in this app (no read_orders scope), so there's no
// denominator for a true "% of orders withdrawn" rate — approvalRate is the
// share of *decided* requests that were approved instead.
export async function getDashboardStats(shop) {
  await connectDB();
  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);

  const [openRequests, approvedLast30, approvedCount, rejectedCount, pendingDocs] =
    await Promise.all([
      WithdrawalRequest.countDocuments({ shop, status: "pending" }),
      WithdrawalRequest.countDocuments({
        shop,
        status: "approved",
        decidedAt: { $gte: thirtyDaysAgo },
      }),
      WithdrawalRequest.countDocuments({ shop, status: "approved" }),
      WithdrawalRequest.countDocuments({ shop, status: "rejected" }),
      WithdrawalRequest.find({ shop, status: "pending" }),
    ]);

  const decidedCount = approvedCount + rejectedCount;
  const approvalRate =
    decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 1000) / 10 : null;

  return {
    openRequests,
    approvedLast30,
    approvalRate,
    revenueAtRisk: sumRevenueAtRisk(pendingDocs.map(serializeWithdrawalRequest)),
  };
}
