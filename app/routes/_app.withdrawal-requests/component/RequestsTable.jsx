/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useEffect, useMemo, useState } from "react";
import { STATUS_TABS, STATUS_TONE, STATUS_LABEL, requestTotal, formatMoney } from "../constants";

const PAGE_SIZE = 2;

export default function RequestsTable({ requests }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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

  // Switching status/search filters can leave `page` past the new result
  // set's last page, which would render an empty table with no way back.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  const isFiltered = statusFilter !== "all" || search.trim().length > 0;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
            onInput={(event) => setSearch(event.currentTarget.value)}
          ></s-search-field>
        </s-stack>

        {filtered.length === 0 ? (
          // <s-section accessibilityLabel="Empty state section">
          //   <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
          //     <s-box maxInlineSize="200px" maxBlockSize="200px" paddingBlock="large-100">
          //       <s-icon type="search" tone="subdued" size="base" accessibilityLabel="No results"></s-icon>
          //     </s-box>
          //     <s-grid justifyItems="center" maxInlineSize="450px" gap="base">
          //       <s-stack alignItems="center">
          //         <s-heading>No withdrawal requests found</s-heading>
          //         <s-paragraph>
          //           {isFiltered
          //             ? "Try changing your search or filter to find what you're looking for."
          //             : "Withdrawal requests submitted by customers will show up here."}
          //         </s-paragraph>
          //       </s-stack>
          //       {isFiltered && (
          //         <s-button-group>
          //           <s-button
          //             slot="secondary-actions"
          //             aria-label="Clear search and filters"
          //             onClick={() => {
          //               setSearch("");
          //               setStatusFilter("all");
          //             }}
          //           >
          //             Clear filters
          //           </s-button>
          //         </s-button-group>
          //       )}
          //     </s-grid>
          //   </s-grid>
          // </s-section>
          <s-section accessibilityLabel="Empty state section">
  <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
    <s-box maxInlineSize="200px" maxBlockSize="200px">
      {/* aspectRatio should match the actual image dimensions (width/height) */}
      <s-image
        aspectRatio="1/0.5"
        src="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
        alt="A stylized graphic of four characters, each holding a puzzle piece"
      />
    </s-box>
    <s-grid justifyItems="center" maxInlineSize="450px" gap="base">
      <s-stack alignItems="center">
        <s-heading>Start creating puzzles</s-heading>
        <s-paragraph>
          Create and manage your collection of puzzles for players to enjoy.
        </s-paragraph>
      </s-stack>
      <s-button-group>
        <s-button
          slot="secondary-actions"
          aria-label="Learn more about creating puzzles"
        >
          {" "}
          Learn more{" "}
        </s-button>
        <s-button slot="primary-action" aria-label="Add a new puzzle">
          {" "}
          Create puzzle{" "}
        </s-button>
      </s-button-group>
    </s-grid>
  </s-grid>
</s-section>
        ) : (
          <s-table
            variant="auto"
            paginate
            hasPreviousPage={currentPage > 1}
            hasNextPage={currentPage < pageCount}
            onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
            onNextPage={() => setPage((current) => Math.min(pageCount, current + 1))}
          >
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
              {paginated.map((request) => (
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
