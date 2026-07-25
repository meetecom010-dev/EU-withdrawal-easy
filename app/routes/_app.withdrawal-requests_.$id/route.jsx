import { data, useLoaderData } from "react-router";
import { authenticate } from "../../shopify.server";
import {
  addWithdrawalRequestNote,
  addWithdrawalRequestTag,
  getWithdrawalRequestById,
  listWithdrawalRequests,
  removeWithdrawalRequestTag,
  updateWithdrawalRequestStatus,
} from "../../services/withdrawal-request.server";
import { handleManualDecision } from "../../services/withdrawal-automation.server";
import { getOrCreateAppSettings, serializeEmailSettings } from "../../services/app-settings.server";
import { buildEmailVariables } from "../../services/email/variables.server";
import { renderEmailTemplate } from "../../services/email/render";
import { fetchShopContact } from "../../services/shopify/shop.server";
import RequestDetail from "./component/RequestDetail";

const DECISION_TEMPLATE = { approved: "withdrawalApproved", rejected: "withdrawalRejected" };

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const [withdrawalRequest, allRequests] = await Promise.all([
    getWithdrawalRequestById(session.shop, params.id),
    listWithdrawalRequests(session.shop),
  ]);

  if (!withdrawalRequest) {
    throw data({ error: "Withdrawal request not found" }, { status: 404 });
  }

  const index = allRequests.findIndex((r) => r.id === withdrawalRequest.id);
  return {
    withdrawalRequest,
    shopDomain: session.shop,
    prevId: index > 0 ? allRequests[index - 1].id : null,
    nextId: index >= 0 && index < allRequests.length - 1 ? allRequests[index + 1].id : null,
  };
};

// intent=decide sets status (approve/reject); intent=note appends an
// internal staff note; intent=add-tag/remove-tag edit the local (unsynced)
// tag list. All come from the same detail page via useFetcher.
export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Renders the approved/rejected email for this request with real data, so the
  // decision modal can show (and let staff edit) the exact message before it's
  // sent. No status change happens here.
  if (intent === "decision-preview") {
    const status = formData.get("status");
    const templateKey = DECISION_TEMPLATE[status];
    if (!templateKey) {
      return data({ error: "Unknown decision" }, { status: 400 });
    }
    const [reqDoc, contact, appSettings] = await Promise.all([
      getWithdrawalRequestById(session.shop, params.id),
      fetchShopContact(admin),
      getOrCreateAppSettings(session.shop),
    ]);
    if (!reqDoc) {
      return data({ error: "Withdrawal request not found" }, { status: 404 });
    }
    const emailSettings = serializeEmailSettings(appSettings);
    const vars = buildEmailVariables(reqDoc, {
      shopName: contact?.name ?? "",
      merchantEmail: contact?.email ?? "",
    });
    const { subject, html } = renderEmailTemplate(emailSettings.templates[templateKey], vars);
    return { preview: { subject, html } };
  }

  if (intent === "note") {
    const withdrawalRequest = await addWithdrawalRequestNote(
      session.shop,
      params.id,
      formData.get("body"),
    );
    return { withdrawalRequest };
  }

  if (intent === "add-tag") {
    const withdrawalRequest = await addWithdrawalRequestTag(
      session.shop,
      params.id,
      formData.get("tag"),
    );
    return { withdrawalRequest };
  }

  if (intent === "remove-tag") {
    const withdrawalRequest = await removeWithdrawalRequestTag(
      session.shop,
      params.id,
      formData.get("tag"),
    );
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

  const withdrawalRequest = await updateWithdrawalRequestStatus(session.shop, params.id, status);

  // Deliberately not surfaced as a failure of the decision itself — a Shopify or
  // email hiccup is recorded in the request's automation log either way.
  let automationError = null;
  if (withdrawalRequest) {
    try {
      await handleManualDecision(session.shop, params.id, {
        email: { send: sendEmail, subject: emailSubject, html: emailHtml },
      });
    } catch (error) {
      automationError = error.message;
    }
  }

  return { withdrawalRequest, decided: true, automationError };
};

export default function WithdrawalRequestDetail() {
  const { withdrawalRequest, shopDomain, prevId, nextId } = useLoaderData();

  return (
    <RequestDetail
      withdrawalRequest={withdrawalRequest}
      shopDomain={shopDomain}
      prevId={prevId}
      nextId={nextId}
    />
  );
}
