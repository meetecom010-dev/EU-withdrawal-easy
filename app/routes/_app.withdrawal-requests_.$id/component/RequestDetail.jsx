/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useEffect, useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  STATUS_TONE,
  STATUS_LABEL,
  withdrawalType,
  requestTotal,
  formatMoney,
  formatDateTime,
  countryName,
  languageName,
  withdrawalDeadline,
} from "../../_app.withdrawal-requests/constants";
import DecisionModal, { DECISION_MODAL_ID } from "./DecisionModal";
import RefundModal, { REFUND_MODAL_ID } from "./RefundModal";

const CANCEL_MODAL_ID = "cancel-order-modal";

// "PARTIALLY_REFUNDED" -> "Partially refunded"
function humanize(value) {
  if (!value) return "—";
  const text = String(value).replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const FINANCIAL_TONE = {
  PAID: "success",
  PARTIALLY_REFUNDED: "warning",
  REFUNDED: "info",
  PARTIALLY_PAID: "warning",
  PENDING: "warning",
  AUTHORIZED: "info",
  VOIDED: "neutral",
  EXPIRED: "critical",
};

const RETURN_TONE = {
  OPEN: "info",
  CLOSED: "success",
  DECLINED: "critical",
  CANCELED: "neutral",
  REQUESTED: "warning",
};

// A label/value row, the building block of the summary-style side cards.
function Row({ label, children }) {
  return (
    <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="base">
      <s-text color="subdued">{label}</s-text>
      {typeof children === "string" ? <s-text>{children}</s-text> : children}
    </s-stack>
  );
}

function ItemRow({ item }) {
  return (
    <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
      <s-stack direction="inline" gap="base" alignItems="center">
        {item.imageUrl && <s-thumbnail src={item.imageUrl} alt={item.title} size="small"></s-thumbnail>}
        <s-stack direction="block" gap="small-100">
          <s-text type="strong">{item.title}</s-text>
          {item.variantTitle && <s-text color="subdued">{item.variantTitle}</s-text>}
          {item.sku && <s-text color="subdued">SKU {item.sku}</s-text>}
        </s-stack>
      </s-stack>
      <s-stack direction="inline" gap="base" alignItems="center">
        <s-text color="subdued">×{item.quantity}</s-text>
        <s-text type="strong">{formatMoney(item.price)}</s-text>
      </s-stack>
    </s-stack>
  );
}

// What each automation/manual step is called in the activity history.
const AUTOMATION_LABEL = {
  resolve_branch: "Automation started",
  hold_fulfillment: "Fulfillment hold",
  schedule_fallback: "Scheduled follow-up",
  release_hold: "Fulfillment hold released",
  cancel_order_immediate: "Order cancelled and refunded",
  cancel_order_scheduled: "Order cancelled and refunded",
  cancel_order_manual: "Order cancelled and refunded",
  refund: "Refund issued",
  tag_before_ship: "Order tagged",
  tag_after_delivery: "Order tagged",
  order_tag_add: "Order tag added",
  order_tag_remove: "Order tag removed",
  create_return: "Shopify return",
  refresh_return: "Return status refreshed",
  fetch_shop_contact: "Store contact lookup",
  customer_email: "Customer confirmation email",
  merchant_email: "Merchant notification email",
  notify_customer: "Customer decision email",
  notify_merchant: "Merchant notified",
};

const OUTCOME_TONE = { success: "success", failed: "critical", skipped: undefined };

function buildTimeline(withdrawalRequest) {
  const events = [
    {
      key: "submitted",
      text: "Withdrawal request submitted via order status page",
      time: new Date(withdrawalRequest.submittedAt),
      muted: true,
    },
  ];

  for (const [index, entry] of (withdrawalRequest.automation?.log ?? []).entries()) {
    // Skipped steps are no-ops (a turned-off setting, nothing to act on) — they
    // add noise without telling staff anything actionable, so they're left out.
    if (entry.outcome === "skipped") continue;
    const label = AUTOMATION_LABEL[entry.action] ?? entry.action;
    events.push({
      key: `automation-${index}`,
      text: `${label}: ${entry.message}`,
      time: new Date(entry.at),
      tone: OUTCOME_TONE[entry.outcome],
      muted: entry.outcome === "skipped",
      detail: entry.outcome === "failed" && entry.data ? entry.data : null,
    });
  }
  if (withdrawalRequest.decidedAt) {
    events.push({
      key: "decided",
      text: `Request marked as ${STATUS_LABEL[withdrawalRequest.status].toLowerCase()}`,
      time: new Date(withdrawalRequest.decidedAt),
      tone: STATUS_TONE[withdrawalRequest.status],
    });
  }
  for (const [index, note] of withdrawalRequest.notes.entries()) {
    events.push({
      key: `note-${index}`,
      text: `Note: ${note.body}`,
      time: new Date(note.createdAt),
    });
  }
  return events.sort((a, b) => b.time - a.time);
}

function TimelineRow({ event }) {
  return (
    <s-stack direction="inline" gap="small-200" alignItems="start">
      <s-icon type="check-circle" tone={event.tone} color={event.tone ? undefined : "subdued"}></s-icon>
      <s-stack direction="block" gap="small-100">
        <s-text color={event.muted ? "subdued" : undefined} tone={event.tone}>
          {event.text}
        </s-text>
        {event.detail && (
          <s-box border="base" borderRadius="base" padding="small-200">
            <s-text color="subdued">
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {JSON.stringify(event.detail, null, 2)}
              </pre>
            </s-text>
          </s-box>
        )}
        <s-text color="subdued">{formatDateTime(event.time)}</s-text>
      </s-stack>
    </s-stack>
  );
}

function DeadlineSection({ withdrawalRequest }) {
  const { deadline, daysLeft, overdue } = withdrawalDeadline(withdrawalRequest);
  const pending = withdrawalRequest.status === "pending";

  return (
    <s-section heading="Deadline">
      <s-stack direction="block" gap="small-200">
        <Row label={pending ? "Decide & refund by" : "Refund deadline"}>
          <s-badge tone={overdue ? "critical" : daysLeft <= 3 ? "warning" : "success"}>
            {overdue ? "Overdue" : pending ? "Act now" : "On time"}
          </s-badge>
        </Row>
        <s-heading>
          {Math.abs(daysLeft)} day{Math.abs(daysLeft) === 1 ? "" : "s"}
        </s-heading>
        <s-paragraph color="subdued">
          {pending
            ? overdue
              ? `Deadline passed ${formatDateTime(deadline)} — refund as soon as possible.`
              : `Left to decide & refund. The 14-day window runs from when this request was submitted.`
            : overdue
              ? `Decided after the ${formatDateTime(deadline)} refund deadline.`
              : `Decided within the 14-day refund window (deadline was ${formatDateTime(deadline)}).`}
        </s-paragraph>
      </s-stack>
    </s-section>
  );
}

// Live Shopify order tags — add/remove writes straight to the order.
function OrderTagsSection({ tags, tagText, onTagTextChange, onAdd, onRemove, disabled }) {
  return (
    <s-section heading="Order tags">
      <s-stack direction="block" gap="small-200">
        {tags.length > 0 && (
          <s-stack direction="inline" gap="small-200">
            {tags.map((tag) => (
              <s-clickable-chip
                key={tag}
                removable={!disabled || undefined}
                accessibilityLabel={`Remove order tag ${tag}`}
                onRemove={() => onRemove(tag)}
              >
                {tag}
              </s-clickable-chip>
            ))}
          </s-stack>
        )}
        <s-grid gridTemplateColumns="1fr auto" gap="small-200" alignItems="start">
          <s-text-field
            label="Add order tag"
            labelAccessibilityVisibility="exclusive"
            placeholder="Add order tag"
            value={tagText}
            disabled={disabled || undefined}
            onChange={(event) => onTagTextChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAdd();
              }
            }}
          ></s-text-field>
          <s-button onClick={onAdd} disabled={disabled || !tagText.trim() || undefined}>
            Add
          </s-button>
        </s-grid>
        <s-text color="subdued">Synced with the order in Shopify admin.</s-text>
      </s-stack>
    </s-section>
  );
}

// Internal, app-only labels (never synced to Shopify, never shown to the buyer).
function InternalLabelsSection({ tags, tagText, onTagTextChange, onAdd, onRemove }) {
  return (
    <s-section heading="Internal labels">
      <s-stack direction="block" gap="small-200">
        {tags.length > 0 && (
          <s-stack direction="inline" gap="small-200">
            {tags.map((tag) => (
              <s-clickable-chip
                key={tag}
                removable
                accessibilityLabel={`Remove label ${tag}`}
                onRemove={() => onRemove(tag)}
              >
                {tag}
              </s-clickable-chip>
            ))}
          </s-stack>
        )}
        <s-grid gridTemplateColumns="1fr auto" gap="small-200" alignItems="start">
          <s-text-field
            label="Add label"
            labelAccessibilityVisibility="exclusive"
            placeholder="Add label"
            value={tagText}
            onChange={(event) => onTagTextChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAdd();
              }
            }}
          ></s-text-field>
          <s-button onClick={onAdd} disabled={!tagText.trim() || undefined}>
            Add
          </s-button>
        </s-grid>
        <s-text color="subdued">Local to this app — never synced to Shopify or shown to the customer.</s-text>
      </s-stack>
    </s-section>
  );
}

// Customer confirmation, merchant notification, and any decision emails, from
// the automation state + log.
function EmailHistorySection({ withdrawalRequest }) {
  const emails = withdrawalRequest.automation?.emails ?? {};
  const rows = [
    { label: "Customer confirmation", ...emails.customer },
    { label: "Merchant notification", ...emails.merchant },
  ];
  for (const [index, entry] of (withdrawalRequest.automation?.log ?? []).entries()) {
    if (entry.action !== "notify_customer") continue;
    rows.push({
      label: "Customer decision email",
      sent: entry.outcome === "success",
      failed: entry.outcome === "failed",
      at: entry.at,
      key: `decision-${index}`,
    });
  }

  const tone = (row) => (row.failed || row.error ? "critical" : row.sent ? "success" : undefined);
  const status = (row) =>
    row.failed || row.error ? "Failed" : row.sent ? "Sent" : "Not sent";

  return (
    <s-section heading="Email history">
      <s-stack direction="block" gap="small-200">
        {rows.map((row, index) => (
          <Row key={row.key ?? index} label={row.label}>
            <s-stack direction="inline" gap="small-200" alignItems="center">
              {row.at && <s-text color="subdued">{formatDateTime(new Date(row.at))}</s-text>}
              <s-badge tone={tone(row)}>{status(row)}</s-badge>
            </s-stack>
          </Row>
        ))}
      </s-stack>
    </s-section>
  );
}

// The contextual action hub — which order actions apply is decided by the live
// branch and order state. Money/irreversible actions open a confirm modal.
function ActionsCard({
  orderState,
  orderStateError,
  hasHold,
  returnId,
  busy,
  onPlaceHold,
  onReleaseHold,
  onCreateReturn,
  onRefreshReturn,
  onRefund,
  onCancel,
}) {
  if (!orderState) {
    return (
      <s-section heading="Actions">
        <s-banner tone="warning">
          {orderStateError ?? "Live order state is unavailable, so order actions are disabled."}
        </s-banner>
      </s-section>
    );
  }

  if (orderState.cancelledAt) {
    return (
      <s-section heading="Actions">
        <s-banner tone="info">This order has been cancelled — no further order actions apply.</s-banner>
      </s-section>
    );
  }

  const beforeShip = orderState.branch === "before_ship";
  const holdable = (orderState.holdableFulfillmentOrders ?? []).length > 0;
  const canRefund = orderState.hasRefundableItems;

  return (
    <s-section heading="Actions">
      <s-stack direction="block" gap="small-300">
        <s-stack direction="inline" gap="small-200" alignItems="center">
          <s-text color="subdued">
            {beforeShip ? "Order not shipped yet" : "Order shipped or delivered"}
          </s-text>
          <s-badge tone={beforeShip ? "info" : "warning"}>
            {beforeShip ? "Before shipping" : "After delivery"}
          </s-badge>
        </s-stack>

        <s-stack direction="inline" gap="small-200">
          {beforeShip && holdable && !hasHold && (
            <s-button disabled={busy || undefined} onClick={onPlaceHold}>
              Place fulfillment hold
            </s-button>
          )}
          {beforeShip && hasHold && (
            <s-button disabled={busy || undefined} onClick={onReleaseHold}>
              Release fulfillment hold
            </s-button>
          )}

          {!beforeShip && !returnId && (
            <s-button disabled={busy || undefined} onClick={onCreateReturn}>
              Create Shopify return
            </s-button>
          )}
          {!beforeShip && returnId && (
            <s-button disabled={busy || undefined} onClick={onRefreshReturn}>
              Refresh return status
            </s-button>
          )}

          {canRefund && (
            <s-button tone="critical" disabled={busy || undefined} onClick={onRefund}>
              Refund withdrawn items
            </s-button>
          )}

          {beforeShip && (
            <s-button tone="critical" disabled={busy || undefined} onClick={onCancel}>
              Cancel order
            </s-button>
          )}
        </s-stack>
      </s-stack>
    </s-section>
  );
}

export default function RequestDetail({
  withdrawalRequest,
  orderState,
  orderStateError,
  shopDomain,
  prevId,
  nextId,
}) {
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const decideFetcher = useFetcher();
  const previewFetcher = useFetcher();
  const noteFetcher = useFetcher();
  const labelFetcher = useFetcher();
  const orderTagFetcher = useFetcher();
  const actionFetcher = useFetcher();
  const refundPreviewFetcher = useFetcher();

  const [noteText, setNoteText] = useState("");
  const [labelText, setLabelText] = useState("");
  const [orderTagText, setOrderTagText] = useState("");
  const [decision, setDecision] = useState(null);

  const deciding = decideFetcher.state !== "idle";
  const actionBusy = actionFetcher.state !== "idle";
  const total = requestTotal(withdrawalRequest.items);
  const type = withdrawalType(withdrawalRequest);
  const timeline = buildTimeline(withdrawalRequest);
  const orderNumericId = withdrawalRequest.orderId?.split("/").pop();

  const hasHold =
    (withdrawalRequest.automation?.holds ?? []).length > 0 &&
    !withdrawalRequest.automation?.holdsReleasedAt;
  const returnId = withdrawalRequest.automation?.returnId;
  const returnStatus = withdrawalRequest.automation?.returnStatus;
  const money = (amount) =>
    formatMoney({ amount, currencyCode: orderState?.currencyCode });

  useEffect(() => {
    if (decideFetcher.state === "idle" && decideFetcher.data?.decided) {
      shopify.toast.show(`Request marked as ${decideFetcher.data.withdrawalRequest.status}`);
      navigate("/withdrawal-requests");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the decide fetcher settling
  }, [decideFetcher.state, decideFetcher.data]);

  // Toast the newest audit entry after any order action, and close the money
  // modals once their action has settled.
  useEffect(() => {
    if (actionFetcher.state !== "idle" || !actionFetcher.data?.withdrawalRequest) return;
    const log = actionFetcher.data.withdrawalRequest.automation?.log ?? [];
    const last = log[log.length - 1];
    if (last) shopify.toast.show(last.message, { isError: last.outcome === "failed" });
    shopify.modal.hide(REFUND_MODAL_ID);
    shopify.modal.hide(CANCEL_MODAL_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the action fetcher settling
  }, [actionFetcher.state, actionFetcher.data]);

  function openDecision(status) {
    setDecision(status);
    previewFetcher.submit({ intent: "decision-preview", status }, { method: "post" });
    shopify.modal.show(DECISION_MODAL_ID);
  }

  function confirmDecision({ subject, html, sendEmail }) {
    decideFetcher.submit(
      { intent: "decide", status: decision, sendEmail: String(sendEmail), subject, html },
      { method: "post" },
    );
  }

  function submitNote() {
    const body = noteText.trim();
    if (!body) return;
    noteFetcher.submit({ intent: "note", body }, { method: "post" });
    setNoteText("");
  }

  function addLabel() {
    const tag = labelText.trim();
    if (!tag) return;
    labelFetcher.submit({ intent: "add-tag", tag }, { method: "post" });
    setLabelText("");
  }
  function removeLabel(tag) {
    labelFetcher.submit({ intent: "remove-tag", tag }, { method: "post" });
  }

  function addOrderTag() {
    const tag = orderTagText.trim();
    if (!tag) return;
    orderTagFetcher.submit({ intent: "order-tag-add", tag }, { method: "post" });
    setOrderTagText("");
  }
  function removeOrderTag(tag) {
    orderTagFetcher.submit({ intent: "order-tag-remove", tag }, { method: "post" });
  }

  function runAction(intent) {
    actionFetcher.submit({ intent }, { method: "post" });
  }

  function openRefund() {
    refundPreviewFetcher.submit({ intent: "refund-preview" }, { method: "post" });
    shopify.modal.show(REFUND_MODAL_ID);
  }
  function confirmRefund() {
    actionFetcher.submit({ intent: "refund" }, { method: "post" });
  }

  function showEvidencePackComingSoon() {
    shopify.toast.show("Evidence pack export is coming soon");
  }

  return (
    <s-page heading={withdrawalRequest.orderName}>
      <s-badge slot="accessory" tone={STATUS_TONE[withdrawalRequest.status]}>
        {STATUS_LABEL[withdrawalRequest.status]}
      </s-badge>
      <s-link slot="breadcrumb-actions" href="/withdrawal-requests" accessibilityLabel="Back to requests"></s-link>

      <s-button
        slot="secondary-actions"
        icon="menu-horizontal"
        variant="tertiary"
        accessibilityLabel="More actions"
        commandFor="more-actions-menu"
      ></s-button>
      <s-menu id="more-actions-menu" accessibilityLabel="More actions">
        {shopDomain && orderNumericId && (
          <s-button href={`https://${shopDomain}/admin/orders/${orderNumericId}`} target="_blank">
            View order in Shopify
          </s-button>
        )}
        <s-button icon="export" onClick={showEvidencePackComingSoon}>
          Evidence pack
        </s-button>
      </s-menu>
      <s-button
        slot="secondary-actions"
        tone="critical"
        onClick={() => openDecision("rejected")}
        disabled={withdrawalRequest.status !== "pending" || deciding}
      >
        Reject
      </s-button>
      <s-button
        slot="secondary-actions"
        variant="primary"
        onClick={() => openDecision("approved")}
        disabled={withdrawalRequest.status !== "pending" || deciding}
        loading={deciding || undefined}
      >
        Approve
      </s-button>

      <DecisionModal
        decision={decision}
        preview={previewFetcher.data?.preview ?? null}
        loading={previewFetcher.state !== "idle"}
        deciding={deciding}
        language={languageName(withdrawalRequest.locale)}
        onConfirm={confirmDecision}
      />
      <RefundModal
        preview={refundPreviewFetcher.data?.refundPreview ?? null}
        loadingPreview={refundPreviewFetcher.state !== "idle"}
        refunding={actionBusy}
        onConfirm={confirmRefund}
      />
      <s-modal id={CANCEL_MODAL_ID} heading="Cancel order">
        <s-stack direction="block" gap="base">
          <s-banner tone="warning">
            This cancels the whole order in Shopify and refunds it to the original payment method.
            It can&apos;t be undone.
          </s-banner>
        </s-stack>
        <s-stack direction="inline" gap="base" alignItems="center" justifyContent="end">
          <s-button onClick={() => shopify.modal.hide(CANCEL_MODAL_ID)}>Keep order</s-button>
          <s-button
            variant="primary"
            tone="critical"
            loading={actionBusy || undefined}
            onClick={() => runAction("cancel-order")}
          >
            Cancel & refund order
          </s-button>
        </s-stack>
      </s-modal>

      <s-button
        slot="secondary-actions"
        icon="chevron-left"
        accessibilityLabel="Previous request"
        href={prevId ? `/withdrawal-requests/${prevId}` : undefined}
        disabled={!prevId}
      ></s-button>
      <s-button
        slot="secondary-actions"
        icon="chevron-right"
        accessibilityLabel="Next request"
        href={nextId ? `/withdrawal-requests/${nextId}` : undefined}
        disabled={!nextId}
      ></s-button>

      <s-stack direction="block" gap="large-100">
        <s-stack direction="inline" gap="small-200" alignItems="center">
          {type && <s-badge>{type}</s-badge>}
          <s-text color="subdued">
            Submitted {formatDateTime(withdrawalRequest.submittedAt)} · via order status page
          </s-text>
        </s-stack>

        {orderStateError && (
          <s-banner tone="warning" heading="Live order state unavailable">
            {orderStateError} Order actions are disabled until it loads.
          </s-banner>
        )}

        {withdrawalRequest.status !== "rejected" && (
          <s-banner tone="info" heading="14-day withdrawal window">
            Under the EU right of withdrawal, refunds must be issued within 14 days of the withdrawal
            request being submitted.
          </s-banner>
        )}

        <s-query-container>
          <s-grid gridTemplateColumns="@container (inline-size > 720px) 2fr 1fr, 1fr" gap="base" alignItems="start">
            <s-stack direction="block" gap="large-100">
              <ActionsCard
                orderState={orderState}
                orderStateError={orderStateError}
                hasHold={hasHold}
                returnId={returnId}
                busy={actionBusy}
                onPlaceHold={() => runAction("place-hold")}
                onReleaseHold={() => runAction("release-hold")}
                onCreateReturn={() => runAction("create-return")}
                onRefreshReturn={() => runAction("refresh-return")}
                onRefund={openRefund}
                onCancel={() => shopify.modal.show(CANCEL_MODAL_ID)}
              />

              <s-section heading="Selected products">
                <s-stack direction="block" gap="base">
                  {withdrawalRequest.items.map((item) => (
                    <ItemRow key={item.lineId} item={item} />
                  ))}
                  <s-divider></s-divider>
                  <s-stack direction="inline" justifyContent="space-between">
                    <s-text type="strong">Total</s-text>
                    <s-text type="strong">{formatMoney(total)}</s-text>
                  </s-stack>
                </s-stack>
              </s-section>

              {returnId && (
                <s-section heading="Return">
                  <s-stack direction="block" gap="small-200">
                    <Row label="Status">
                      <s-badge tone={RETURN_TONE[returnStatus] ?? "info"}>
                        {humanize(returnStatus) ?? "Open"}
                      </s-badge>
                    </Row>
                    {withdrawalRequest.automation?.returnCreatedAt && (
                      <Row label="Created">
                        {formatDateTime(new Date(withdrawalRequest.automation.returnCreatedAt))}
                      </Row>
                    )}
                    <s-text color="subdued">
                      A Shopify return was created for the withdrawn items. Refresh to pull its latest
                      status from Shopify.
                    </s-text>
                  </s-stack>
                </s-section>
              )}

              <s-section heading="Refund">
                <s-stack direction="block" gap="small-200">
                  {orderState ? (
                    <>
                      <Row label="Payment status">
                        <s-badge tone={FINANCIAL_TONE[orderState.financialStatus] ?? "neutral"}>
                          {humanize(orderState.financialStatus)}
                        </s-badge>
                      </Row>
                      <Row label="Order total">{money(orderState.totalPrice)}</Row>
                      <Row label="Refunded">{money(orderState.totalRefunded)}</Row>
                      {!orderState.hasRefundableItems && (
                        <s-text color="subdued">Nothing further is refundable on this order.</s-text>
                      )}
                    </>
                  ) : (
                    <s-text color="subdued">Refund state is unavailable right now.</s-text>
                  )}
                </s-stack>
              </s-section>

              <s-section heading="Activity history">
                <s-stack direction="block" gap="base">
                  <s-grid gridTemplateColumns="1fr auto" gap="small-200" alignItems="start">
                    <s-text-field
                      label="Leave an internal note"
                      labelAccessibilityVisibility="exclusive"
                      placeholder="Leave an internal note…"
                      value={noteText}
                      onChange={(event) => setNoteText(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          submitNote();
                        }
                      }}
                    ></s-text-field>
                    <s-button onClick={submitNote} disabled={!noteText.trim() || undefined}>
                      Post
                    </s-button>
                  </s-grid>
                  <s-text color="subdued">
                    Only you and staff can see notes — they&apos;re never shown to the customer.
                  </s-text>
                  <s-divider></s-divider>
                  <s-stack direction="block" gap="base">
                    {timeline.map((event) => (
                      <TimelineRow key={event.key} event={event} />
                    ))}
                  </s-stack>
                </s-stack>
              </s-section>
            </s-stack>

            <s-stack direction="block" gap="large-100">
              {withdrawalRequest.status !== "rejected" && (
                <DeadlineSection withdrawalRequest={withdrawalRequest} />
              )}

              <s-section heading="Customer">
                <s-stack direction="block" gap="small-200">
                  <Row label="Name">
                    <s-stack direction="inline" gap="small-100" alignItems="center">
                      {withdrawalRequest.countryCode && <s-badge>{withdrawalRequest.countryCode}</s-badge>}
                      <s-text type="strong">{withdrawalRequest.customerName || "—"}</s-text>
                    </s-stack>
                  </Row>
                  <Row label="Email">
                    {withdrawalRequest.customerEmail ? (
                      <s-link href={`mailto:${withdrawalRequest.customerEmail}`}>
                        {withdrawalRequest.customerEmail}
                      </s-link>
                    ) : (
                      <s-text>—</s-text>
                    )}
                  </Row>
                  <Row label="Country">{countryName(withdrawalRequest.countryCode) || "—"}</Row>
                  {languageName(withdrawalRequest.locale) && (
                    <Row label="Language">{languageName(withdrawalRequest.locale)}</Row>
                  )}
                  {withdrawalRequest.shippingAddress && (
                    <>
                      <s-divider></s-divider>
                      <s-text color="subdued">Shipping address</s-text>
                      <s-text>{withdrawalRequest.shippingAddress}</s-text>
                    </>
                  )}
                </s-stack>
              </s-section>

              <s-section heading="Order">
                <s-stack direction="block" gap="small-200">
                  <Row label="Order">
                    {shopDomain && orderNumericId ? (
                      <s-link href={`https://${shopDomain}/admin/orders/${orderNumericId}`} target="_blank">
                        {withdrawalRequest.orderName}
                      </s-link>
                    ) : (
                      <s-text>{withdrawalRequest.orderName}</s-text>
                    )}
                  </Row>
                  {orderState?.createdAt && (
                    <Row label="Placed">{formatDateTime(new Date(orderState.createdAt))}</Row>
                  )}
                  {orderState && (
                    <>
                      <Row label="Payment">
                        <s-badge tone={FINANCIAL_TONE[orderState.financialStatus] ?? "neutral"}>
                          {humanize(orderState.financialStatus)}
                        </s-badge>
                      </Row>
                      <Row label="Fulfillment">
                        <s-badge tone={orderState.fulfillmentStatus === "FULFILLED" ? "success" : "neutral"}>
                          {humanize(orderState.fulfillmentStatus)}
                        </s-badge>
                      </Row>
                    </>
                  )}
                </s-stack>
              </s-section>

              <s-section heading="Automation status">
                <s-stack direction="block" gap="small-200">
                  <Row label="Stage">
                    {withdrawalRequest.automation?.branch
                      ? humanize(withdrawalRequest.automation.branch)
                      : orderState
                        ? humanize(orderState.branch)
                        : "—"}
                  </Row>
                  <Row label="Hold">
                    <s-badge tone={hasHold ? "warning" : "neutral"}>
                      {hasHold ? "On hold" : withdrawalRequest.automation?.holdsReleasedAt ? "Released" : "None"}
                    </s-badge>
                  </Row>
                  {withdrawalRequest.automation?.cancelledAt && (
                    <Row label="Cancelled">
                      {formatDateTime(new Date(withdrawalRequest.automation.cancelledAt))}
                    </Row>
                  )}
                  {returnId && (
                    <Row label="Return">
                      <s-badge tone={RETURN_TONE[returnStatus] ?? "info"}>{humanize(returnStatus)}</s-badge>
                    </Row>
                  )}
                </s-stack>
              </s-section>

              <EmailHistorySection withdrawalRequest={withdrawalRequest} />

              <OrderTagsSection
                tags={orderState?.tags ?? []}
                tagText={orderTagText}
                onTagTextChange={setOrderTagText}
                onAdd={addOrderTag}
                onRemove={removeOrderTag}
                disabled={!orderState || Boolean(orderState?.cancelledAt)}
              />

              <InternalLabelsSection
                tags={withdrawalRequest.tags}
                tagText={labelText}
                onTagTextChange={setLabelText}
                onAdd={addLabel}
                onRemove={removeLabel}
              />

              <s-section heading="Reason given">
                <s-stack direction="block" gap="small-200">
                  <s-box background="subdued" borderRadius="base" padding="base">
                    <s-paragraph>
                      {withdrawalRequest.reason ? `"${withdrawalRequest.reason}"` : "No reason given."}
                    </s-paragraph>
                  </s-box>
                  <s-text color="subdued">Optional field — a reason is never required.</s-text>
                </s-stack>
              </s-section>
            </s-stack>
          </s-grid>
        </s-query-container>
      </s-stack>
    </s-page>
  );
}
