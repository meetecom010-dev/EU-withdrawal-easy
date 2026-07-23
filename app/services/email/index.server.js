// Public entry point for the email service. Import from here rather than
// reaching into individual files:
//
//   import { sendWithdrawalEmails } from "../services/email/index.server";
//
// Adding a new email type means adding a template + sender and, if it belongs
// to submission, wiring it into sendWithdrawalEmails — nothing else changes.

export { isEmailConfigured } from "./brevo.server";
export { sendCustomerEmail } from "./send-customer-email.server";
export { sendMerchantEmail } from "./send-merchant-email.server";

import { sendCustomerEmail } from "./send-customer-email.server";
import { sendMerchantEmail } from "./send-merchant-email.server";

/**
 * Sends both submission emails — customer confirmation and merchant
 * notification — concurrently. Never throws: each sender already resolves to a
 * result, so a failure in one can't stop the other or the withdrawal flow.
 *
 * @param {object} request  serialized withdrawal request
 * @param {{ shopName?: string, merchantEmail?: string, appUrl?: string }} context
 * @returns {Promise<{
 *   customer: { sent: boolean, messageId: string|null, error: string|null },
 *   merchant: { sent: boolean, messageId: string|null, error: string|null },
 * }>}
 */
export async function sendWithdrawalEmails(request, context = {}) {
  const [customer, merchant] = await Promise.all([
    sendCustomerEmail(request, context),
    sendMerchantEmail(request, context),
  ]);
  return { customer, merchant };
}
