// Public entry point for the email service. Import from here rather than
// reaching into individual files.
//
// Adding a new email means adding a template to registry.js and calling the
// right sender from wherever the event happens — nothing here has to change for
// a template that fits the customer/merchant recipient split.

export { isEmailConfigured } from "./brevo.server";
export { sendCustomerTemplate, sendCustomerRawEmail } from "./send-customer-email.server";
export { sendMerchantTemplate } from "./send-merchant-email.server";

import { sendCustomerTemplate } from "./send-customer-email.server";
import { sendMerchantTemplate } from "./send-merchant-email.server";

/**
 * Sends both submission emails — customer confirmation and merchant
 * notification — concurrently. Never throws.
 *
 * @param {object} request  serialized withdrawal request
 * @param {{ shopName?: string, merchantEmail?: string, appUrl?: string, emailSettings?: object }} context
 */
export async function sendWithdrawalEmails(request, context = {}) {
  const [customer, merchant] = await Promise.all([
    sendCustomerTemplate("customerConfirmation", request, context),
    sendMerchantTemplate("merchantNotification", request, context),
  ]);
  return { customer, merchant };
}

// Decision emails (approved/rejected) are sent from the admin decision flow via
// sendCustomerRawEmail, so staff can review and edit the exact message before
// it goes — there is no automatic decision send here.
