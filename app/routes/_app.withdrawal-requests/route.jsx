import { authenticate } from "../../shopify.server";
import RequestsTable from "./component/RequestsTable";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

// Dummy data until a real WithdrawalRequest model exists.
const DUMMY_REQUESTS = [
  {
    id: "1",
    orderName: "#1001",
    customerName: "Ada Lovelace",
    reason: "Changed my mind",
    status: "pending",
    submittedAt: "2026-06-20",
  },
  {
    id: "2",
    orderName: "#1002",
    customerName: "Grace Hopper",
    reason: "Wrong size",
    status: "approved",
    submittedAt: "2026-06-18",
  },
  {
    id: "3",
    orderName: "#1003",
    customerName: "Alan Turing",
    reason: "Item defective",
    status: "rejected",
    submittedAt: "2026-06-15",
  },
];

export default function WithdrawalRequests() {
  return (
    <s-page heading="Withdrawal requests">
      <RequestsTable requests={DUMMY_REQUESTS} />
    </s-page>
  );
}
