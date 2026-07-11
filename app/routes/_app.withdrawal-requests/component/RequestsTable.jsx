/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useMemo, useState } from "react";
import { STATUS_TABS, STATUS_TONE, STATUS_LABEL, requestTotal, formatMoney } from "../constants";

export default function RequestsTable({ requests }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const byStatus = { all: requests.length, pending: 0, approved: 0, rejected: 0 };
    for (const request of requests) byStatus[request.status] = (byStatus[request.status] ?? 0) + 1;
    return byStatus;
  }, [requests]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (statusFilter !== "all" && request.status !== statusFilter) return false;
      if (!query) return true;
      return [request.orderName, request.customerName, request.customerEmail]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [requests, statusFilter, search]);

  return (
    <s-section>
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
          <s-stack direction="inline" gap="small-200">
            {STATUS_TABS.map((tab) => (
              <s-button
                key={tab.key}
                variant={statusFilter === tab.key ? "primary" : "secondary"}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label} ({counts[tab.key] ?? 0})
              </s-button>
            ))}
          </s-stack>
          <s-search-field
            label="Search requests"
            labelAccessibilityVisibility="exclusive"
            placeholder="Search order or customer"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          ></s-search-field>
        </s-stack>

        {filtered.length === 0 ? (
          <s-paragraph color="subdued">No withdrawal requests match this view.</s-paragraph>
        ) : (
          <s-table variant="auto">
            <s-table-header-row>
              <s-table-header>Order</s-table-header>
              <s-table-header>Customer</s-table-header>
              <s-table-header>Items</s-table-header>
              <s-table-header>Value</s-table-header>
              <s-table-header>Reason</s-table-header>
              <s-table-header>Status</s-table-header>
              <s-table-header>Submitted</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {filtered.map((request) => (
                <s-table-row key={request.id} clickDelegate={`request-link-${request.id}`}>
                  <s-table-cell>
                    <s-link id={`request-link-${request.id}`} href={`/withdrawal-requests/${request.id}`}>
                      {request.orderName}
                    </s-link>
                  </s-table-cell>
                  <s-table-cell>
                    <s-stack direction="block" gap="small-100">
                      <s-text type="strong">{request.customerName || "—"}</s-text>
                      <s-text color="subdued">{request.customerEmail}</s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>
                    {request.items.length} item{request.items.length === 1 ? "" : "s"}
                  </s-table-cell>
                  <s-table-cell>{formatMoney(requestTotal(request.items))}</s-table-cell>
                  <s-table-cell>{request.reason || "—"}</s-table-cell>
                  <s-table-cell>
                    <s-badge tone={STATUS_TONE[request.status]}>
                      {STATUS_LABEL[request.status]}
                    </s-badge>
                  </s-table-cell>
                  <s-table-cell>{new Date(request.submittedAt).toLocaleDateString()}</s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-stack>
    </s-section>
  );
}
