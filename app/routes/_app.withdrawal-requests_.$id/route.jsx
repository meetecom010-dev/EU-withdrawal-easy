import { data, useLoaderData } from "react-router";
import { authenticate } from "../../shopify.server";
import { translateError } from "../../i18n/errors";
import { getRequestT } from "../../i18n/server";
import {
  addWithdrawalRequestNote,
  findAdjacentRequestIds,
  getWithdrawalRequestById,
  updateWithdrawalRequestStatus,
} from "../../services/withdrawal-request.server";
import {
  handleManualDecision,
  placeHoldForRequest,
  releaseHoldForRequest,
  cancelOrderForRequest,
  refundForRequest,
  createReturnForRequestManual,
  previewReturnForRequest,
  previewRefundForRequest,
  previewReturnRefundForRequest,
  processReturnForRequest,
  syncOrderTagsForRequest,
} from "../../services/withdrawal-automation.server";
import { getOrCreateAppSettings, serializeEmailSettings } from "../../services/app-settings.server";
import { buildEmailVariables } from "../../services/email/variables.server";
import { renderEmailTemplate } from "../../services/email/render";
import { pickTemplateForLocale } from "../../services/email/registry";
import { fetchShopContact } from "../../services/shopify/shop.server";
import { fetchOrderAdminState } from "../../services/shopify/orders.server";
import { fetchReturnDetail } from "../../services/shopify/returns.server";
import RequestDetail from "./component/RequestDetail";

const DECISION_TEMPLATE = { approved: "withdrawalApproved", rejected: "withdrawalRejected" };

// Not "release-hold": a hold this app placed must stay releasable after a
// decision, in case the automatic release on approve/reject failed.
const ORDER_ACTION_INTENTS = new Set([
  "place-hold",
  "cancel-order",
  "refund-preview",
  "refund",
  "return-preview",
  "create-return",
  "return-refund-preview",
  "process-return",
]);

// Every intent this action handles. Anything else is refused up front instead
// of falling through to the decision branch.
const KNOWN_INTENTS = new Set([
  ...ORDER_ACTION_INTENTS,
  "decide",
  "decision-preview",
  "note",
  "order-tags-save",
  "release-hold",
]);

// The staged tag edits from the save bar: a JSON array of strings, or nothing.
function parseTagList(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((tag) => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const t = getRequestT(request);
  const withdrawalRequest = await getWithdrawalRequestById(session.shop, params.id);

  if (!withdrawalRequest) {
    throw data({ error: t("errors.requestNotFound") }, { status: 404 });
  }

  const adjacentPromise = findAdjacentRequestIds(session.shop, withdrawalRequest);

  // Live order state drives the contextual actions and keeps the Order tags in
  // sync. Fail soft: if Shopify can't be reached the page still renders the
  // stored request, with a banner and actions disabled, rather than erroring.
  let orderState = null;
  let orderStateError = null;
  try {
    orderState = await fetchOrderAdminState(admin, withdrawalRequest.orderId);
    if (!orderState) orderStateError = t("errors.orderNotFound");
  } catch (error) {
    orderStateError = translateError(error, t);
  }

  // Whether "Process and refund" has anything left to refund: at least one
  // unprocessed item on the open return must still be refundable on the order.
  // It may not be, e.g. when the item was already refunded from Shopify admin.
  // Null when it couldn't be checked; the page then keeps the button and the
  // dialog's own preview shows the real figure.
  let returnRefundAvailable = null;
  const returnId = withdrawalRequest.automation?.returnId;
  const liveReturn = returnId ? orderState?.returns?.find((ret) => ret.id === returnId) : null;
  if (liveReturn?.status === "OPEN") {
    try {
      const detail = await fetchReturnDetail(admin, returnId);
      returnRefundAvailable = (detail?.lines ?? []).some((line) => {
        const orderLine = orderState.lineItems.find((item) => item.id === line.lineItemId);
        return line.unprocessedQuantity > 0 && (orderLine?.refundableQuantity ?? 0) > 0;
      });
    } catch {
      returnRefundAvailable = null;
    }
  }

  const { prevId, nextId } = await adjacentPromise;
  return {
    withdrawalRequest,
    orderState,
    orderStateError,
    returnRefundAvailable,
    shopDomain: session.shop,
    prevId,
    nextId,
  };
};

// intent=decide sets status (approve/reject); intent=note appends an
// internal staff note; intent=order-tags-save applies a staged batch of order
// tag adds/removes from the save bar. All come from the same detail page via
// useFetcher.
export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const t = getRequestT(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (!KNOWN_INTENTS.has(intent)) {
    return data({ error: t("errors.unknownAction") }, { status: 400 });
  }

  // Order actions apply while the request is pending and after it's approved
  // (an approved withdrawal still has to be refunded, returned or cancelled).
  // Once it's rejected the page disables them, and this refuses them too, so a
  // stale tab can't refund, cancel, hold or return against a rejected request.
  if (ORDER_ACTION_INTENTS.has(intent)) {
    const reqDoc = await getWithdrawalRequestById(session.shop, params.id);
    if (!reqDoc) return data({ error: t("errors.requestNotFound") }, { status: 404 });
    if (reqDoc.status === "rejected") {
      return data({ error: t("errors.requestDecided") }, { status: 409 });
    }
  }

  // Renders the approved/rejected email for this request with real data, so the
  // decision modal can show (and let staff edit) the exact message before it's
  // sent. No status change happens here.
  if (intent === "decision-preview") {
    const status = formData.get("status");
    const templateKey = DECISION_TEMPLATE[status];
    if (!templateKey) {
      return data({ error: t("errors.unknownDecision") }, { status: 400 });
    }
    const [reqDoc, contact, appSettings] = await Promise.all([
      getWithdrawalRequestById(session.shop, params.id),
      fetchShopContact(admin),
      getOrCreateAppSettings(session.shop),
    ]);
    if (!reqDoc) {
      return data({ error: t("errors.requestNotFound") }, { status: 404 });
    }
    const emailSettings = serializeEmailSettings(appSettings);
    const vars = buildEmailVariables(reqDoc, {
      shopName: contact?.name ?? "",
      merchantEmail: contact?.email ?? "",
    });
    // Render the decision email in the buyer's language so staff review (and the
    // customer receives) the message in the same language as the rest of the flow.
    const template = emailSettings.templates[templateKey];
    const localized = pickTemplateForLocale(template, reqDoc.locale);
    const { subject, html } = renderEmailTemplate(localized, vars);
    // The template's "Send this email" switch in Email templates sets whether
    // the modal starts with the email checked; staff can still change it.
    return { preview: { subject, html, enabled: template.enabled !== false } };
  }

  if (intent === "note") {
    const withdrawalRequest = await addWithdrawalRequestNote(
      session.shop,
      params.id,
      formData.get("body"),
    );
    return { withdrawalRequest };
  }

  // Live Shopify order tags — the detail page stages edits locally and sends
  // the whole batch here when the save bar's Save is clicked (the loader
  // reads tags live, so no local copy is kept between saves).
  if (intent === "order-tags-save") {
    const added = parseTagList(formData.get("added"));
    const removed = parseTagList(formData.get("removed"));
    const withdrawalRequest = await syncOrderTagsForRequest(session.shop, params.id, { added, removed });
    return { withdrawalRequest };
  }

  // Fulfillment hold (before-ship).
  if (intent === "place-hold") {
    const withdrawalRequest = await placeHoldForRequest(session.shop, params.id);
    return { withdrawalRequest };
  }
  if (intent === "release-hold") {
    const withdrawalRequest = await releaseHoldForRequest(session.shop, params.id);
    return { withdrawalRequest };
  }

  // Return (after-delivery). The preview lists exactly the units the return
  // will cover (only what has shipped), for the confirm dialog.
  if (intent === "return-preview") {
    try {
      const returnPreview = await previewReturnForRequest(session.shop, params.id);
      if (!returnPreview) return data({ error: t("errors.requestNotFound") }, { status: 404 });
      return { returnPreview };
    } catch (error) {
      return { returnPreview: { error: translateError(error, t) } };
    }
  }
  if (intent === "create-return") {
    const withdrawalRequest = await createReturnForRequestManual(session.shop, params.id);
    return { withdrawalRequest };
  }

  // Cancel the whole order (cancels + refunds via Shopify).
  if (intent === "cancel-order") {
    const withdrawalRequest = await cancelOrderForRequest(session.shop, params.id);
    return { withdrawalRequest };
  }

  // Refund the withdrawn items (plus shipping on a full withdrawal — decided in
  // the service from the request itself). The amount the merchant sees in the
  // confirm dialog comes from `refund-preview` (Shopify's suggested refund), the
  // actual refund from `refund`.
  if (intent === "refund-preview") {
    try {
      const refundPreview = await previewRefundForRequest(session.shop, params.id);
      if (!refundPreview) return data({ error: t("errors.requestNotFound") }, { status: 404 });
      return { refundPreview };
    } catch (error) {
      return { refundPreview: { error: translateError(error, t) } };
    }
  }

  // "Process and refund" on the return this request created: the preview for
  // the confirm dialog, then the real thing (returnProcess with a refund).
  if (intent === "return-refund-preview") {
    try {
      const returnRefundPreview = await previewReturnRefundForRequest(session.shop, params.id);
      if (!returnRefundPreview) {
        return data({ error: t("errors.requestNotFound") }, { status: 404 });
      }
      return { returnRefundPreview };
    } catch (error) {
      return { returnRefundPreview: { error: translateError(error, t) } };
    }
  }
  if (intent === "process-return") {
    const withdrawalRequest = await processReturnForRequest(session.shop, params.id);
    return { withdrawalRequest };
  }
  if (intent === "refund") {
    const withdrawalRequest = await refundForRequest(session.shop, params.id);
    return { withdrawalRequest };
  }

  // intent=decide: set the status, then run the manual-decision handler, which
  // retires scheduled automation, releases any holds, and sends the customer
  // the decision email that staff reviewed/edited in the modal (subject + html,
  // unless they chose not to email).
  const status = formData.get("status");
  const sendEmail = formData.get("sendEmail") === "true";
  const emailSubject = formData.get("subject") ?? "";
  const emailHtml = formData.get("html") ?? "";

  if (!DECISION_TEMPLATE[status]) {
    return data({ error: t("errors.unknownDecision") }, { status: 400 });
  }
  // A request is decided once. Deciding again (a double click, a stale tab)
  // would re-send the customer's decision email.
  const current = await getWithdrawalRequestById(session.shop, params.id);
  if (!current) return data({ error: t("errors.requestNotFound") }, { status: 404 });
  if (current.status !== "pending") {
    return { withdrawalRequest: current, decided: false, error: t("errors.alreadyDecided") };
  }

  const withdrawalRequest = await updateWithdrawalRequestStatus(session.shop, params.id, status, {
    onlyIfPending: true,
  });
  // Another decision landed between the check above and this write.
  if (!withdrawalRequest) {
    const latest = await getWithdrawalRequestById(session.shop, params.id);
    return { withdrawalRequest: latest, decided: false, error: t("errors.alreadyDecided") };
  }

  // Deliberately not surfaced as a failure of the decision itself — a Shopify or
  // email hiccup is recorded in the request's automation log either way.
  let automationError = null;
  if (withdrawalRequest) {
    try {
      await handleManualDecision(session.shop, params.id, {
        email: { send: sendEmail, subject: emailSubject, html: emailHtml },
      });
    } catch (error) {
      automationError = translateError(error, t);
    }
  }

  return { withdrawalRequest, decided: true, automationError };
};

export default function WithdrawalRequestDetail() {
  const {
    withdrawalRequest,
    orderState,
    orderStateError,
    returnRefundAvailable,
    shopDomain,
    prevId,
    nextId,
  } = useLoaderData();

  return (
    <RequestDetail
      withdrawalRequest={withdrawalRequest}
      orderState={orderState}
      orderStateError={orderStateError}
      returnRefundAvailable={returnRefundAvailable}
      shopDomain={shopDomain}
      prevId={prevId}
      nextId={nextId}
    />
  );
}
