// Merchant notification for the "Notify only" after-delivery action.
//
// Two channels. The in-app one always succeeds — the request is already in the
// database and shows up under Withdrawal Requests, so recording it is the
// durable part. Email is best-effort on top: Shopify has no merchant-email
// API, so it goes through a provider, and a shop that hasn't configured one
// still gets the in-app record. A failed email must never fail the automation.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function emailConfig() {
  // eslint-disable-next-line no-undef
  const apiKey = process.env.RESEND_API_KEY;
  // eslint-disable-next-line no-undef
  const from = process.env.WITHDRAWAL_NOTIFICATION_FROM;
  return apiKey && from ? { apiKey, from } : null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmail(request, { shop, appUrl }) {
  const itemLines = request.items
    .map(
      (item) =>
        `<li>${escapeHtml(item.title)}${item.sku ? ` (${escapeHtml(item.sku)})` : ""} &times; ${item.quantity ?? 1}</li>`,
    )
    .join("");

  const detailUrl = appUrl ? `${appUrl}/withdrawal-requests/${request.id}` : null;

  return {
    subject: `Withdrawal request for order ${request.orderName || request.orderId}`,
    html: `
      <p>A customer submitted a withdrawal request after delivery.</p>
      <p>
        <strong>Order:</strong> ${escapeHtml(request.orderName || request.orderId)}<br />
        <strong>Customer:</strong> ${escapeHtml(request.customerName)} &lt;${escapeHtml(request.customerEmail)}&gt;<br />
        ${request.reason ? `<strong>Reason:</strong> ${escapeHtml(request.reason)}<br />` : ""}
      </p>
      <p><strong>Items</strong></p>
      <ul>${itemLines}</ul>
      <p>No return was created automatically — your automation is set to notify only.</p>
      ${detailUrl ? `<p><a href="${escapeHtml(detailUrl)}">Review the request</a></p>` : ""}
      <p style="color:#6d7175;font-size:12px">Sent by EU Withdrawly for ${escapeHtml(shop)}.</p>
    `,
  };
}

async function sendEmail(to, request, context) {
  const config = emailConfig();
  if (!config) {
    return { sent: false, reason: "email_not_configured" };
  }
  if (!to) {
    return { sent: false, reason: "no_recipient" };
  }

  const { subject, html } = buildEmail(request, context);
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: config.from, to: [to], subject, html }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Email provider returned ${response.status}: ${body.slice(0, 200)}`);
  }

  return { sent: true };
}

/**
 * Notifies the merchant about a request. Never throws — the caller records the
 * outcome in the automation log and carries on.
 *
 * @returns {Promise<{ channels: string[], emailError: string | null }>}
 */
export async function notifyMerchantOfRequest(request, { shop, recipientEmail, appUrl }) {
  // In-app is the channel that always works: the request row is the record.
  const channels = ["in_app"];
  let emailError = null;

  try {
    const result = await sendEmail(recipientEmail, request, { shop, appUrl });
    if (result.sent) {
      channels.push("email");
    } else {
      emailError = result.reason;
    }
  } catch (error) {
    emailError = error.message;
  }

  return { channels, emailError };
}
