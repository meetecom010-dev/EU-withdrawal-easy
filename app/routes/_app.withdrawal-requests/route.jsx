import { useLoaderData } from "react-router";
import { authenticate } from "../../shopify.server";
import { listWithdrawalRequests, getDashboardStats } from "../../services/withdrawal-request.server";
import RequestsTable from "./component/RequestsTable";
import StatsGrid from "../../components/StatsGrid";
import { downloadRequestsCsv } from "./constants";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const [requests, stats] = await Promise.all([
    listWithdrawalRequests(session.shop),
    getDashboardStats(session.shop),
  ]);
  return { requests, stats };
};

export default function WithdrawalRequests() {
  const { requests, stats } = useLoaderData();

  return (
    <s-page heading="Withdrawal requests">
      <s-button
        slot="secondary-actions"
        disabled={requests.length === 0}
        onClick={() => downloadRequestsCsv(requests)}
      >
        Export CSV
      </s-button>
      <s-stack direction="block" gap="large-100">
        <s-paragraph color="subdued">
          Every withdrawal submission from the order status page, matched to its order. Click a
          request to review the items, customer details, and approve or reject it.
        </s-paragraph>
        <StatsGrid stats={stats} showHeader={false} />
        <RequestsTable requests={requests} />
      </s-stack>
    </s-page>
  );
}
