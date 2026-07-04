/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
const STATUS_TONE = {
  pending: "warning",
  approved: "success",
  rejected: "critical",
};

export default function RequestsTable({ requests }) {
  if (requests.length === 0) {
    return (
      <s-section>
        <s-paragraph color="subdued">No withdrawal requests yet.</s-paragraph>
      </s-section>
    );
  }

  return (
    <s-table variant="auto">
      <s-table-header-row>
        <s-table-header>Order</s-table-header>
        <s-table-header>Customer</s-table-header>
        <s-table-header>Reason</s-table-header>
        <s-table-header>Status</s-table-header>
        <s-table-header>Submitted</s-table-header>
      </s-table-header-row>
      <s-table-body>
        {requests.map((request) => (
          <s-table-row key={request.id}>
            <s-table-cell>{request.orderName}</s-table-cell>
            <s-table-cell>{request.customerName}</s-table-cell>
            <s-table-cell>{request.reason}</s-table-cell>
            <s-table-cell>
              <s-badge tone={STATUS_TONE[request.status]}>{request.status}</s-badge>
            </s-table-cell>
            <s-table-cell>
              {new Date(request.submittedAt).toLocaleDateString()}
            </s-table-cell>
          </s-table-row>
        ))}
      </s-table-body>
    </s-table>
  );
}
