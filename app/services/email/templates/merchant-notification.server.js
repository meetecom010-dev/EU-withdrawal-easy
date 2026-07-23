import { detailRow, renderLayout } from "./layout.server";
import { escapeHtml, formatDate, formatStatus, renderItemRows } from "../utils/format.server";

// Merchant-facing alert that a new withdrawal request came in. Action-oriented
// — it leads with what needs attention and links straight to the request in
// the app when an appUrl is available.
export function buildMerchantNotificationEmail(vars) {
  const subject = `New withdrawal request${vars.orderNumber ? ` — order ${vars.orderNumber}` : ""}`;

  const reviewButton = vars.reviewUrl
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 20px">
        <tr>
          <td style="border-radius:8px;background:#202223">
            <a href="${escapeHtml(vars.reviewUrl)}"
               style="display:inline-block;padding:11px 20px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">
              Review request
            </a>
          </td>
        </tr>
      </table>`
    : "";

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:20px;color:#202223">New withdrawal request</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#202223">
      A customer submitted a withdrawal request${vars.orderNumber ? ` for order ${escapeHtml(vars.orderNumber)}` : ""}.
      Here are the details.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px">
      ${detailRow("Request reference", escapeHtml(vars.requestId))}
      ${detailRow(
        "Customer",
        `${escapeHtml(vars.customerName || "—")}${vars.customerEmail ? `<br /><a href="mailto:${escapeHtml(vars.customerEmail)}" style="color:#2c6ecb">${escapeHtml(vars.customerEmail)}</a>` : ""}`,
      )}
      ${vars.orderNumber ? detailRow("Order", escapeHtml(vars.orderNumber)) : ""}
      ${detailRow("Submitted on", escapeHtml(formatDate(vars.submissionDate)))}
      ${detailRow("Current status", escapeHtml(formatStatus(vars.status)))}
      ${vars.reason ? detailRow("Reason given", escapeHtml(vars.reason)) : detailRow("Reason given", "<em style='color:#6d7175'>None provided</em>")}
    </table>

    ${reviewButton}

    <h2 style="margin:0 0 8px;font-size:15px;color:#202223">Items requested</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px">
      ${renderItemRows(vars.items)}
    </table>`;

  return {
    subject,
    html: renderLayout({
      title: subject,
      preheader: `${vars.customerName || "A customer"} requested a withdrawal${vars.orderNumber ? ` for ${vars.orderNumber}` : ""}.`,
      bodyHtml,
      shopName: vars.shopName,
    }),
  };
}
