import { useLoaderData } from "react-router";
import { authenticate } from "../../shopify.server";
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

  return { error: "Unknown action" };
};

export default function WithdrawalRequests() {
  const { requests, stats } = useLoaderData();

  return (
    <s-page heading="Withdrawal requests">
      <s-stack direction="block" gap="large-100">
        {/* <s-paragraph color="subdued">
          Every withdrawal submission from the order status page, matched to its order. Click a
          request to review the items, customer details, and approve or reject it.
        </s-paragraph> */}
        <StatsGrid stats={stats} showHeader={false} />
        <RequestsTable requests={requests} />
      </s-stack>
    </s-page>
  );
}
