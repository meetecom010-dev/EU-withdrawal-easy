import { useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { authenticate } from "../../shopify.server";
import { getRequestT } from "../../i18n/server";
import {
  listWithdrawalRequests,
  getDashboardStats,
  deleteWithdrawalRequests,
} from "../../services/withdrawal-request.server";
import RequestsTable from "./component/RequestsTable";
import StatsGrid from "../../components/StatsGrid";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const [requests, stats] = await Promise.all([
    listWithdrawalRequests(session.shop),
    getDashboardStats(session.shop),
  ]);
  return { requests, stats };
};

// intent=delete removes one or more requests (single row delete or bulk delete
// from the table). The table submits the ids as a JSON array via useFetcher,
// then React Router revalidates the loader so the table refreshes.
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    let ids = [];
    try {
      ids = JSON.parse(formData.get("ids") || "[]");
    } catch {
      ids = [];
    }
    const deleted = await deleteWithdrawalRequests(session.shop, ids);
    return { deleted };
  }

  return { error: getRequestT(request)("errors.unknownAction") };
};

export default function WithdrawalRequests() {
  const { t } = useTranslation();
  const { requests, stats } = useLoaderData();

  return (
    <s-page heading={t("requests.pageTitle")}>
      <s-stack direction="block" gap="large-100">
        <StatsGrid stats={stats} showViewRequestsButton={false} />
        <RequestsTable requests={requests} />
      </s-stack>
    </s-page>
  );
}
