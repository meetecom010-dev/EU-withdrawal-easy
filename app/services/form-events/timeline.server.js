import connectDB from "../../db.server";
import FormEvent from "../../models/form-event.server";

// Read side: the single support snapshot for an order (or request). Open one
// document and see the whole lifecycle — which events succeeded, which failed,
// their errors, timestamps, and the final automation status.

function serialize(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(obj._id),
    shop: obj.shop,
    orderId: obj.orderId,
    withdrawalRequestId: obj.withdrawalRequestId ? String(obj.withdrawalRequestId) : null,
    sessionId: obj.sessionId,
    events: obj.events ?? {},
    log: obj.log ?? [],
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

export async function getFormEventForOrder(shop, orderId) {
  await connectDB();
  const doc = await FormEvent.findOne({ shop, orderId });
  return doc ? serialize(doc) : null;
}

export async function getFormEventForRequest(shop, withdrawalRequestId) {
  await connectDB();
  const doc = await FormEvent.findOne({ shop, withdrawalRequestId });
  return doc ? serialize(doc) : null;
}
