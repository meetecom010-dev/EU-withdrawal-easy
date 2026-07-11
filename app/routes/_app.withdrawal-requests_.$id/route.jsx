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
import RequestDetail from "./component/RequestDetail";

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
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

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

  const status = formData.get("status");
  const withdrawalRequest = await updateWithdrawalRequestStatus(session.shop, params.id, status);
  return { withdrawalRequest, decided: true };
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
