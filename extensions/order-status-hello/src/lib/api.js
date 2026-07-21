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
    throw new Error(`Failed to submit withdrawal request (${response.status})`);
  }

  return response.json();
}
