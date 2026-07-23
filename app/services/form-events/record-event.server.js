import connectDB from "../../db.server";
import FormEvent from "../../models/form-event.server";
import { buildAutomationUpdate, buildFunnelUpdate } from "./project.server";

// Writers for the per-order snapshot. Both upsert on (shop, orderId) so the
// first event creates the document and every later one updates the same record
// — never a duplicate. Both never throw: event tracking observes the
// withdrawal flow, it must never break it. A failed write is logged and
// swallowed; WithdrawalRequest.automation still holds the operational state as
// a backup.

/**
 * Records one funnel / form event (button viewed, form opened, form submitted)
 * onto the order's snapshot, creating the document if it doesn't exist yet.
 */
export async function recordFormEvent(shop, orderId, event) {
  if (!shop || !orderId) return null;
  try {
    await connectDB();
    return await FormEvent.updateOne({ shop, orderId }, buildFunnelUpdate(event), { upsert: true });
  } catch (error) {
    console.error("[form-events] Failed to record event", event?.type, error);
    return null;
  }
}

/**
 * Projects a run's buffered automation log entries onto the order's snapshot in
 * one atomic update.
 */
export async function recordAutomationEvents(shop, orderId, entries, { withdrawalRequestId } = {}) {
  if (!shop || !orderId || !entries?.length) return null;
  try {
    await connectDB();
    return await FormEvent.updateOne(
      { shop, orderId },
      buildAutomationUpdate(entries, { withdrawalRequestId }),
      { upsert: true },
    );
  } catch (error) {
    console.error("[form-events] Failed to record automation events", error);
    return null;
  }
}
