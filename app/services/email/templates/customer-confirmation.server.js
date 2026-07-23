import { detailRow, renderLayout } from "./layout.server";
import { escapeHtml, formatDate, formatStatus, renderItemRows } from "../utils/format.server";

// Customer-facing confirmation that their withdrawal request was received.
// Reassuring in tone — it confirms receipt and sets the expectation that the
// store will follow up, without promising an outcome.
//
// `vars` is the shape produced by buildEmailVariables (../variables.server.js),
// so both templates read the same field names.
export function buildCustomerConfirmationEmail(vars) {
  const subject = `We've received your withdrawal request${vars.orderNumber ? ` for order ${vars.orderNumber}` : ""}`;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:20px;color:#202223">Withdrawal request received</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#202223">
      Hi ${escapeHtml(vars.customerName || "there")}, thanks for letting us know. We've received
      your withdrawal request and our team will review it shortly. You'll hear from
      ${escapeHtml(vars.shopName || "the store")} with the next steps.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px">
      ${detailRow("Request reference", escapeHtml(vars.requestId))}
      ${vars.orderNumber ? detailRow("Order", escapeHtml(vars.orderNumber)) : ""}
      ${detailRow("Submitted on", escapeHtml(formatDate(vars.submissionDate)))}
      ${detailRow("Current status", escapeHtml(formatStatus(vars.status)))}
      ${vars.reason ? detailRow("Your reason", escapeHtml(vars.reason)) : ""}
    </table>

    <h2 style="margin:0 0 8px;font-size:15px;color:#202223">Items you're withdrawing</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
      ${renderItemRows(vars.items)}
    </table>

    <p style="margin:0;font-size:13px;line-height:1.5;color:#6d7175">
      If you didn't make this request, or anything looks wrong, reply to this email
      ${vars.merchantEmail ? `or contact ${escapeHtml(vars.shopName || "the store")} at ${escapeHtml(vars.merchantEmail)}` : ""}.
    </p>`;

  return {
    subject,
    html: renderLayout({
      title: subject,
      preheader: "We've received your withdrawal request and will review it shortly.",
      bodyHtml,
      shopName: vars.shopName,
    }),
  };
}
