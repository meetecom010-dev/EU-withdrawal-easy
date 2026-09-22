/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  STATUS_TABS,
  STATUS_TONE,
  STATUS_LABEL,
  requestTotal,
  formatMoney,
  downloadRequestsCsv,
} from "../constants";

const PAGE_SIZE = 5;
const DELETE_MODAL_ID = "delete-requests-modal";

export default function RequestsTable({ requests }) {
  const shopify = useAppBridge();
  const deleteFetcher = useFetcher();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // Row selection (checkbox column) and the ids queued for the delete confirm
  // modal — used for both a single-row delete and a bulk delete.
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteIds, setDeleteIds] = useState([]);
  const deleting = deleteFetcher.state !== "idle";

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
  const isFiltered = statusFilter !== "all" || search.trim().length > 0;

  // Switching status/search filters can leave `page` past the new result
  // set's last page, which would render an empty table with no way back.
  // Selection is cleared too, so it always refers to rows currently in view.
  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [statusFilter, search]);

  // After a delete settles, close the modal, toast the count, and clear both
  // the selection and the queued ids. The loader revalidates on its own.
  useEffect(() => {
    if (deleteFetcher.state === "idle" && deleteFetcher.data?.deleted != null) {
      shopify.modal.hide(DELETE_MODAL_ID);
      const n = deleteFetcher.data.deleted;
      shopify.toast.show(`Deleted ${n} request${n === 1 ? "" : "s"}`);
      setSelectedIds([]);
      setDeleteIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the delete fetcher settling
  }, [deleteFetcher.state, deleteFetcher.data]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Selection is scoped to the current filtered view (it's cleared when the
  // filter/search changes), so the header checkbox toggles exactly those rows.
  const filteredIds = filtered.map((request) => request.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  function toggleAll(checked) {
    setSelectedIds(checked ? filteredIds : []);
  }
  function toggleRow(id, checked) {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, id])] : current.filter((x) => x !== id),
    );
  }
  function exportSelected() {
    const rows =
      selectedIds.length > 0
        ? requests.filter((request) => selectedIds.includes(request.id))
        : filtered;
    downloadRequestsCsv(rows);
  }
  function openDelete(ids) {
    setDeleteIds(ids);
    shopify.modal.show(DELETE_MODAL_ID);
  }
  function confirmDelete() {
    deleteFetcher.submit(
      { intent: "delete", ids: JSON.stringify(deleteIds) },
      { method: "post" },
    );
  }

  return (
    <s-section padding="none">
      <s-stack direction="block" gap="base">
        <s-box padding="base" paddingBlockEnd="none">
          <s-stack direction="block" gap="base">
            <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
              <s-search-field
                label="Search requests"
                labelAccessibilityVisibility="exclusive"
                placeholder="Search order or customer"
                value={search}
                onInput={(event) => setSearch(event.currentTarget.value)}
              ></s-search-field>
              <s-button onClick={exportSelected}>
                {selectedIds.length > 0 ? "Export selected" : "Export"}
              </s-button>
            </s-grid>
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
          </s-stack>
        </s-box>

        {filtered.length === 0 ? (
          <>
            <s-divider></s-divider>
            <s-section accessibilityLabel="Empty state section">
              <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
                <s-box maxInlineSize="200px" maxBlockSize="200px">
                  <s-image
                    aspectRatio="1/0.5"
                    src="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
                    alt="No withdrawal requests"
                  />
                </s-box>
                <s-grid justifyItems="center" maxInlineSize="450px" gap="base">
                  <s-stack alignItems="center">
                    <s-heading>No withdrawal requests found</s-heading>
                    <s-paragraph>
                      {isFiltered
                        ? "Try changing your search or filter to find what you're looking for."
                        : "Withdrawal requests submitted by customers will show up here."}
                    </s-paragraph>
                  </s-stack>
                </s-grid>
              </s-grid>
            </s-section>
          </>
        ) : (
          <s-stack direction="block" gap="none">
            <s-table
              variant="auto"
              paginate
              hasPreviousPage={currentPage > 1}
              hasNextPage={currentPage < pageCount}
              onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
              onNextPage={() => setPage((current) => Math.min(pageCount, current + 1))}
            >
              <s-table-header-row>
                <s-table-header>
                  <s-checkbox
                    accessibilityLabel="Select all requests"
                    checked={allSelected}
                    indeterminate={someSelected || undefined}
                    onChange={(event) => toggleAll(event.currentTarget.checked)}
                  ></s-checkbox>
                </s-table-header>
                <s-table-header>
                  {selectedIds.length > 0 ? (
                    <s-text type="strong">{selectedIds.length} selected</s-text>
                  ) : (
                    "Order"
                  )}
                </s-table-header>
                <s-table-header>{selectedIds.length === 0 ? "Customer name" : ""}</s-table-header>
                <s-table-header>{selectedIds.length === 0 ? "Items" : ""}</s-table-header>
                <s-table-header>{selectedIds.length === 0 ? "Value" : ""}</s-table-header>
                <s-table-header>{selectedIds.length === 0 ? "Status" : ""}</s-table-header>
                <s-table-header>{selectedIds.length === 0 ? "Submitted" : ""}</s-table-header>
                <s-table-header>
                  <s-box minBlockSize="2rem">
                    <s-stack direction="inline" justifyContent="end">
                      {selectedIds.length > 0 ? (
                        <s-button
                          tone="critical"
                          disabled={deleting || undefined}
                          onClick={() => openDelete(selectedIds)}
                        >
                          Delete
                        </s-button>
                      ) : (
                        "Actions"
                      )}
                    </s-stack>
                  </s-box>
                </s-table-header>
              </s-table-header-row>
              <s-table-body>
                {paginated.map((request) => (
                <s-table-row key={request.id}>
                  <s-table-cell>
                    <s-checkbox
                      accessibilityLabel={`Select ${request.orderName}`}
                      checked={selectedIds.includes(request.id)}
                      onChange={(event) => toggleRow(request.id, event.currentTarget.checked)}
                    ></s-checkbox>
                  </s-table-cell>
                  <s-table-cell>
                    <s-link href={`/withdrawal-requests/${request.id}`}>
                      {request.orderName}
                    </s-link>
                  </s-table-cell>
                  <s-table-cell>
                    <s-text type="strong">{request.customerName || "—"}</s-text>
                  </s-table-cell>
                  <s-table-cell>
                    {request.items.length} item{request.items.length === 1 ? "" : "s"}
                  </s-table-cell>
                  <s-table-cell>{formatMoney(requestTotal(request.items))}</s-table-cell>
                  <s-table-cell>
                    <s-badge tone={STATUS_TONE[request.status]}>
                      {STATUS_LABEL[request.status]}
                    </s-badge>
                  </s-table-cell>
                  <s-table-cell>{new Date(request.submittedAt).toLocaleDateString()}</s-table-cell>
                  <s-table-cell>
                    <s-stack direction="inline" gap="small-200" justifyContent="end">
                      <s-button
                        icon="edit"
                        variant="tertiary"
                        accessibilityLabel={`Edit ${request.orderName}`}
                        href={`/withdrawal-requests/${request.id}`}
                      ></s-button>
                      <s-button
                        icon="delete"
                        variant="tertiary"
                        tone="critical"
                        accessibilityLabel={`Delete ${request.orderName}`}
                        disabled={deleting || undefined}
                        onClick={() => openDelete([request.id])}
                      ></s-button>
                    </s-stack>
                  </s-table-cell>
                </s-table-row>
                ))}
              </s-table-body>
            </s-table>
          </s-stack>
        )}

        <s-modal
          id={DELETE_MODAL_ID}
          heading={`Delete ${deleteIds.length === 1 ? "1 request" : `${deleteIds.length} requests`}?`}
        >
          <s-stack direction="block" gap="large-100">
            <s-paragraph>
              Are you sure you want to permanently delete{" "}
              {deleteIds.length === 1
                ? "this withdrawal request"
                : `these ${deleteIds.length} withdrawal requests`}
              ? This can&apos;t be undone.
            </s-paragraph>
            <s-stack direction="inline" gap="small-200" alignItems="center" justifyContent="end">
              <s-button onClick={() => shopify.modal.hide(DELETE_MODAL_ID)}>Cancel</s-button>
              <s-button
                variant="primary"
                tone="critical"
                loading={deleting || undefined}
                onClick={confirmDelete}
              >
                Delete
              </s-button>
            </s-stack>
          </s-stack>
        </s-modal>
      </s-stack>
    </s-section>
  );
}
