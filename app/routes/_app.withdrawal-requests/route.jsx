import { useLoaderData } from "react-router";
import { authenticate } from "../../shopify.server";
import { listWithdrawalRequests } from "../../services/withdrawal-request.server";
import RequestsTable from "./component/RequestsTable";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const requests = await listWithdrawalRequests(session.shop);
  return { requests };
};

export default function WithdrawalRequests() {
  const { requests } = useLoaderData();

  return (
    <s-page heading="Withdrawal requests">
      <s-stack direction="block" gap="large-100">
        <s-paragraph color="subdued">
          Every withdrawal submission from the order status page, matched to its order. Click a
          request to review the items, customer details, and approve or reject it.
        </s-paragraph>
        <RequestsTable requests={requests} />
      </s-stack>
    </s-page>
  );
}
