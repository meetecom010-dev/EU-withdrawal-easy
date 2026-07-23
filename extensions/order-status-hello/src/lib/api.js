import { APP_URL } from "./config.js";

// Fetches the withdrawal form config from this app's backend
// (app/routes/api/public-form-settings.jsx). The session token proves to the
// backend that the request came from this shop's order-status page — see
// network_access in shopify.extension.toml.
export async function fetchFormSettings() {
  const token = await shopify.sessionToken.get();
  const response = await fetch(`${APP_URL}/api/public-form-settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to load withdrawal form settings (${response.status})`);
  }

  return response.json();
}

// Fetches the order's customer name/email from this app's backend
// (app/routes/api/public-order-details.jsx). Without protected customer
// data access the extension API exposes no buyer identity at all, so the
// backend looks it up via the Admin API — gated by the order's confirmation
// number, which only the buyer viewing the order status page has.
export async function fetchOrderDetails(orderId, confirmationNumber) {
  const token = await shopify.sessionToken.get();
  const params = new URLSearchParams({ orderId, confirmationNumber });
  const response = await fetch(`${APP_URL}/api/public-order-details?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to load order details (${response.status})`);
  }

  return response.json();
}

// Asks the backend where this order is in its lifecycle and whether it can
// still be withdrawn from (app/routes/api/public-withdrawal-eligibility.jsx).
//
// The extension API's `shopify.order` doesn't report fulfillment or delivery
// state, so this is the only way to know which set of merchant copy applies —
// and it's resolved live on each load, never cached, so an order marked
// delivered between two visits shows the delivered wording on the second.
export async function fetchWithdrawalEligibility(orderId, confirmationNumber) {
  const token = await shopify.sessionToken.get();
  const params = new URLSearchParams({ orderId, confirmationNumber });
  const response = await fetch(`${APP_URL}/api/public-withdrawal-eligibility?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load withdrawal eligibility (${response.status})`);
  }

  return response.json();
}

// Records a pre-submission funnel event (button viewed / form opened) against
// this app's backend (app/routes/api/public-form-events.jsx). Fire-and-forget:
// funnel telemetry must never block or break the form, so failures are logged
// and swallowed. `keepalive` lets the ping outlive a page navigation.
export async function recordFormEvent({ orderId, type, sessionId }) {
  try {
    const token = await shopify.sessionToken.get();
    await fetch(`${APP_URL}/api/public-form-events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, type, sessionId }),
      keepalive: true,
    });
  } catch (error) {
    console.error("[withdrawal-form] Couldn't record form event", type, error);
  }
}

// Submits a withdrawal request to this app's backend
// (app/routes/api/public-withdrawal-requests.jsx), where it's persisted so
// it shows up in the admin's Withdrawal Requests table.
/**
 * @param {{
 *   orderId: string,
 *   orderName?: string,
 *   customerName?: string,
 *   customerEmail?: string,
 *   countryCode?: string,
 *   reason?: string,
 *   orderLineCount?: number,
 *   shippingAddress?: string,
 *   items: Array<{
 *     lineId: string,
 *     title?: string,
 *     sku?: string,
 *     imageUrl?: string,
 *     quantity?: number,
 *     price?: { amount: number, currencyCode: string } | null,
 *   }>,
 * }} payload
 */
export async function submitWithdrawalRequest(payload) {
  const token = await shopify.sessionToken.get();
  const response = await fetch(`${APP_URL}/api/public-withdrawal-requests`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // 409 (already requested) and 422 (past the deadline) carry a message
    // written for the customer. Surfacing it beats "something went wrong",
    // which would leave them retrying a submission that can never succeed.
    const body = await response.json().catch(() => null);
    const error = new Error(
      body?.error ?? `Failed to submit withdrawal request (${response.status})`,
    );
    error.code = body?.code ?? null;
    error.status = response.status;
    throw error;
  }

  return response.json();
}
