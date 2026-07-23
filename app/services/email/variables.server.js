// Maps a serialized withdrawal request plus shop context into the flat set of
// variables both templates read. One builder means the customer and merchant
// emails can never disagree about what the order number or reference is, and a
// new template just consumes the same shape.
//
// Every dynamic value listed in the feature brief is produced here:
// customer name/email, order number, request id, submission date, selected
// products, reason, current status, shop name, and merchant contact.
export function buildEmailVariables(request, { shopName, merchantEmail, appUrl } = {}) {
  return {
    customerName: request.customerName || "",
    customerEmail: request.customerEmail || "",
    orderNumber: request.orderName || request.orderId || "",
    requestId: request.id,
    submissionDate: request.submittedAt ?? null,
    items: request.items ?? [],
    reason: request.reason || "",
    status: request.status || "pending",
    shopName: shopName || "",
    merchantEmail: merchantEmail || "",
    // Deep link to the request in the admin, for the merchant email's button.
    reviewUrl: appUrl ? `${appUrl.replace(/\/$/, "")}/withdrawal-requests/${request.id}` : null,
  };
}
