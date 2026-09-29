/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useEffect, useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  REFUND_WINDOW_DAYS,
  STATUS_TONE,
  requestTotal,
  withdrawalDeadline,
} from "../../_app.withdrawal-requests/constants";
import { useFormatters } from "../../../i18n/react";
import DecisionModal, { DECISION_MODAL_ID } from "./DecisionModal";
import RefundModal, { REFUND_MODAL_ID } from "./RefundModal";
import CreateReturnModal, { CREATE_RETURN_MODAL_ID } from "./CreateReturnModal";
import ProcessReturnModal, { PROCESS_RETURN_MODAL_ID } from "./ProcessReturnModal";
import ItemRow from "./ItemRow";

const CANCEL_MODAL_ID = "cancel-order-modal";
const ORDER_TAGS_SAVE_BAR_ID = "order-tags-save-bar";

// "PARTIALLY_REFUNDED" -> "Partially refunded". Fallback for Shopify enum
// values that have no translation under orderStatus.* yet.
function humanize(value) {
  const text = String(value).replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "Jane Doe" -> "JD" for the customer avatar fallback.
function initials(name) {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Tone maps mirror Shopify admin's own Order page badges (displayFinancialStatus /
// displayFulfillmentStatus / return status), translated into this design
// system's tone vocabulary (neutral/info/success/warning/critical — there's no
// "attention" or "new" tone here, unlike classic Polaris badges).
const FINANCIAL_TONE = {
  PENDING: "warning",
  AUTHORIZED: "warning",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  PARTIALLY_REFUNDED: "neutral",
  REFUNDED: "neutral",
  VOIDED: "neutral",
  EXPIRED: "critical",
};

const FULFILLMENT_TONE = {
  UNFULFILLED: "neutral",
  PENDING_FULFILLMENT: "warning",
  OPEN: "neutral",
  IN_PROGRESS: "info",
  ON_HOLD: "warning",
  PARTIALLY_FULFILLED: "warning",
  FULFILLED: "success",
  RESTOCKED: "neutral",
  SCHEDULED: "neutral",
};

const RETURN_TONE = {
  REQUESTED: "warning",
  OPEN: "info",
  CLOSED: "success",
  DECLINED: "critical",
  CANCELED: "neutral",
};

// Translates a Shopify status enum (orderStatus.<group>.<VALUE>), falling back
// to a humanized version of the raw value for anything not in en.json.
function useStatusLabel() {
  const { t } = useTranslation();
  return (group, value) => {
    if (!value) return t("common.emptyValue");
    return t(`orderStatus.${group}.${value}`, { defaultValue: humanize(value) });
  };
}

// The text for one automation log entry. Entries written with a messageKey are
// rendered in the merchant's language; older entries and raw Shopify/provider
// errors only have their stored `message`.
function useActivityMessage() {
  const { t } = useTranslation();
  const { formatDateTime, formatMoney } = useFormatters();
  return (entry) => {
    if (!entry.messageKey) return entry.message;
    const values = { ...(entry.messageValues ?? {}) };
    if (values.date) values.date = formatDateTime(values.date);
    if (values.currencyCode) {
      values.amount = formatMoney({ amount: values.amount, currencyCode: values.currencyCode });
    }
    if (Array.isArray(values.tags)) values.tags = values.tags.join(", ");
    return t(`requestDetail.activity.messages.${entry.messageKey}`, values);
  };
}

// A label/value row, the building block of the summary-style side cards.
function Row({ label, children }) {
  return (
    <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="base">
      <s-text color="subdued">{label}</s-text>
      {typeof children === "string" ? <s-text>{children}</s-text> : children}
    </s-stack>
  );
}

// Where a withdrawn item stands on a split order, matched to the live order
// line the same way the automation matches it: variant first, then the
// LineItem id the storefront page submits. Null when there's nothing useful to
// show (no match, or an item that never ships).
function itemShippingState(item, orderLines) {
  const line =
    (item.variantId && orderLines.find((candidate) => candidate.variantId === item.variantId)) ||
    orderLines.find((candidate) => candidate.id === item.lineId);
  if (!line || line.unshippedQuantity == null) return null;
  if (line.unshippedQuantity <= 0) return "shipped";
  // Against the current quantity, not the original: units removed or refunded
  // off the line aren't "shipped", and counting them would badge an entirely
  // unshipped line as partly shipped.
  const onOrder = line.currentQuantity ?? line.quantity;
  return line.unshippedQuantity >= onOrder ? "notShipped" : "partlyShipped";
}

// A preview fetcher's result, or a top-level `{ error }` the action returned
// instead (e.g. the request was decided in another tab) turned into
// `{ error }` so the modal shows it rather than spinning forever.
function previewData(fetcher, key) {
  const data = fetcher.data;
  if (!data) return null;
  return data[key] ?? (data.error ? { error: data.error } : null);
}

const OUTCOME_TONE = { success: "success", failed: "critical", skipped: undefined };

function useTimeline(withdrawalRequest) {
  const { t } = useTranslation();
  const activityMessage = useActivityMessage();

  const source = withdrawalRequest.source ?? "order_status";
  const events = [
    {
      key: "submitted",
      text: t("requestDetail.activity.submitted", {
        source: t(`sourceInline.${source}`, { defaultValue: t("sourceInline.order_status") }),
      }),
      time: new Date(withdrawalRequest.submittedAt),
      muted: true,
    },
  ];

  for (const [index, entry] of (withdrawalRequest.automation?.log ?? []).entries()) {
    // Skipped steps are no-ops (a turned-off setting, nothing to act on) — they
    // add noise without telling staff anything actionable, so they're left out.
    if (entry.outcome === "skipped") continue;
    events.push({
      key: `automation-${index}`,
      text: t("requestDetail.activity.entry", {
        label: t(`requestDetail.activity.actions.${entry.action}`, {
          defaultValue: humanize(entry.action),
        }),
        message: activityMessage(entry),
      }),
      time: new Date(entry.at),
      tone: OUTCOME_TONE[entry.outcome],
      muted: entry.outcome === "skipped",
      detail: entry.outcome === "failed" && entry.data ? entry.data : null,
    });
  }
  if (withdrawalRequest.decidedAt) {
    events.push({
      key: "decided",
      text: t(`requestDetail.activity.decided.${withdrawalRequest.status}`),
      time: new Date(withdrawalRequest.decidedAt),
      tone: STATUS_TONE[withdrawalRequest.status],
    });
  }
  for (const [index, note] of withdrawalRequest.notes.entries()) {
    events.push({
      key: `note-${index}`,
      text: t("requestDetail.activity.note", { body: note.body }),
      time: new Date(note.createdAt),
    });
  }
  return events.sort((a, b) => b.time - a.time);
}

function TimelineRow({ event }) {
  const { formatDateTime } = useFormatters();

  // A grid rather than an inline stack: an inline stack wraps a long message
  // onto its own line below the icon, while the fixed icon column keeps the
  // text indented and wrapping in place.
  return (
    <s-grid gridTemplateColumns="auto 1fr" gap="small-200" alignItems="start">
      <s-icon type="check-circle" tone={event.tone} color={event.tone ? undefined : "subdued"}></s-icon>
      <s-stack direction="block" gap="small-500">
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
    </s-grid>
  );
}

function DeadlineSection({ withdrawalRequest }) {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();
  const { deadline, daysLeft, overdue } = withdrawalDeadline(withdrawalRequest);
  const pending = withdrawalRequest.status === "pending";
  const days = Math.abs(daysLeft);
  const date = formatDateTime(deadline);
  // Fraction of the refund window still remaining — a full bar means the whole
  // window is left, and it empties (and shifts warning → critical) as the
  // deadline nears. Colours are hard-coded because s-box backgrounds only
  // expose neutral tones, not semantic ones.
  const remaining = Math.max(0, Math.min(1, daysLeft / REFUND_WINDOW_DAYS));
  const barColor = overdue ? "#d72c0d" : daysLeft <= 3 ? "#b98900" : "#1a7f52";

  const D = "requestDetail.deadline.";
  const daysText = pending
    ? t(overdue ? `${D}daysOverdue` : `${D}daysLeft`, { count: days })
    : t(overdue ? `${D}daysLate` : `${D}daysEarly`, { count: days });
  const explanation = pending
    ? t(overdue ? `${D}pendingOverdue` : `${D}pending`, {
        date,
        days: t("common.dayCount", { count: REFUND_WINDOW_DAYS }),
      })
    : t(overdue ? `${D}decidedLate` : `${D}decidedOnTime`, {
        date,
        windowDays: REFUND_WINDOW_DAYS,
      });

  return (
    <s-section heading={t(`${D}heading`)}>
      <s-stack direction="block" gap="small-200">
        <Row label={pending ? t(`${D}pendingLabel`) : t(`${D}decidedLabel`)}>
          <s-badge tone={overdue ? "critical" : daysLeft <= 3 ? "warning" : "success"}>
            {overdue
              ? t(`${D}badges.overdue`)
              : pending
                ? t(`${D}badges.actionNeeded`)
                : t(`${D}badges.onTime`)}
          </s-badge>
        </Row>
        <s-heading>{daysText}</s-heading>
        <div
          style={{
            height: "8px",
            borderRadius: "999px",
            background: "rgba(128,128,128,0.2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${remaining * 100}%`,
              borderRadius: "999px",
              background: barColor,
            }}
          />
        </div>
        <s-paragraph color="subdued">{explanation}</s-paragraph>
      </s-stack>
    </s-section>
  );
}

// Live Shopify order tags — edits stage locally and only write to the order
// when the contextual save bar's Save is clicked (see ORDER_TAGS_SAVE_BAR_ID).
function OrderTagsSection({ tags, tagText, onTagTextChange, onRemove, disabled }) {
  const { t } = useTranslation();

  return (
    <s-section heading={t("requestDetail.tags.heading")}>
      <s-stack direction="block" gap="small-200">
        <s-text-field
          label={t("requestDetail.tags.label")}
          labelAccessibilityVisibility="exclusive"
          placeholder={t("requestDetail.tags.placeholder")}
          value={tagText}
          disabled={disabled || undefined}
          onInput={(event) => onTagTextChange(event.currentTarget.value)}
        ></s-text-field>
        {tags.length > 0 && (
          <s-stack direction="inline" gap="small-200">
            {tags.map((tag) => (
              <s-clickable-chip
                key={tag}
                removable={!disabled || undefined}
                accessibilityLabel={t("requestDetail.tags.remove", { tag })}
                onRemove={() => onRemove(tag)}
              >
                {tag}
              </s-clickable-chip>
            ))}
          </s-stack>
        )}
      </s-stack>
    </s-section>
  );
}

// Customer confirmation, merchant notification, and any decision emails, from
// the automation state + log.
function EmailHistorySection({ withdrawalRequest }) {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();
  const E = "requestDetail.emails.";
  const emails = withdrawalRequest.automation?.emails ?? {};
  const rows = [
    { label: t(`${E}customerConfirmation`), ...emails.customer },
    { label: t(`${E}merchantNotification`), ...emails.merchant },
  ];
  for (const [index, entry] of (withdrawalRequest.automation?.log ?? []).entries()) {
    if (entry.action !== "notify_customer") continue;
    rows.push({
      label: t(`${E}decision`),
      sent: entry.outcome === "success",
      failed: entry.outcome === "failed",
      at: entry.at,
      key: `decision-${index}`,
    });
  }

  const tone = (row) => (row.failed || row.error ? "critical" : row.sent ? "success" : undefined);
  const status = (row) =>
    row.failed || row.error
      ? t(`${E}statuses.failed`)
      : row.sent
        ? t(`${E}statuses.sent`)
        : t(`${E}statuses.notSent`);

  return (
    <s-section heading={t(`${E}heading`)}>
      <s-stack direction="block" gap="base">
        {rows.map((row, index) => (
          <s-stack key={row.key ?? index} direction="block" gap="small-500">
            <s-text type="strong">{row.label}</s-text>
            <s-stack direction="inline" gap="small-200" alignItems="center">
              {row.at && <s-text color="subdued">{formatDateTime(new Date(row.at))}</s-text>}
              <s-badge tone={tone(row)}>{status(row)}</s-badge>
            </s-stack>
          </s-stack>
        ))}
      </s-stack>
    </s-section>
  );
}

export default function RequestDetail({
  withdrawalRequest,
  orderState,
  orderStateError,
  returnRefundAvailable,
  shopDomain,
  prevId,
  nextId,
}) {
  const { t } = useTranslation();
  const { formatMoney, formatDateTime, formatLongDateTime, regionName, languageName } =
    useFormatters();
  const statusLabel = useStatusLabel();
  const activityMessage = useActivityMessage();
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const decideFetcher = useFetcher();
  const previewFetcher = useFetcher();
  const noteFetcher = useFetcher();
  const orderTagFetcher = useFetcher();
  const actionFetcher = useFetcher();
  const refundPreviewFetcher = useFetcher();
  const returnPreviewFetcher = useFetcher();
  const returnRefundPreviewFetcher = useFetcher();

  const [noteText, setNoteText] = useState("");
  const [orderTags, setOrderTags] = useState(() => orderState?.tags ?? []);
  const [orderTagText, setOrderTagText] = useState("");
  const [decision, setDecision] = useState(null);
  // A failed order action shows in a banner at the top of the page; toasts are
  // only for results that worked.
  const [actionError, setActionError] = useState(null);

  const deciding = decideFetcher.state !== "idle";
  const actionBusy = actionFetcher.state !== "idle";
  const total = requestTotal(withdrawalRequest.items);
  const timeline = useTimeline(withdrawalRequest);
  const orderNumericId = withdrawalRequest.orderId?.split("/").pop();
  const customerLanguage = languageName(withdrawalRequest.locale);
  const customerCountry = regionName(withdrawalRequest.countryCode);

  const hasHold =
    (withdrawalRequest.automation?.holds ?? []).length > 0 &&
    !withdrawalRequest.automation?.holdsReleasedAt;
  const returnId = withdrawalRequest.automation?.returnId;
  // The order's live return list wins over our stored status: the merchant
  // may have processed or closed the return in Shopify since we last looked.
  const returnStatus =
    orderState?.returns?.find((ret) => ret.id === returnId)?.status ??
    withdrawalRequest.automation?.returnStatus;
  const returnOpen = Boolean(returnId) && returnStatus === "OPEN";
  // "Process and refund" only shows while the open return still has something
  // to refund. False means its items were already refunded (e.g. in Shopify
  // admin); null means the loader couldn't check, so the button stays and the
  // dialog's preview shows the real figure.
  const canProcessReturn = returnOpen && returnRefundAvailable !== false;
  // Shopify cancels orders as a background job, so orderState.cancelledAt can
  // lag a few seconds behind reality. Our own record is set the moment
  // Shopify accepts the cancellation, so it's trusted first — the banner and
  // badge below flip immediately instead of waiting on the next live fetch.
  const cancelled = Boolean(orderState?.cancelledAt || withdrawalRequest.automation?.cancelledAt);
  const money = (amount) =>
    formatMoney({ amount, currencyCode: orderState?.currencyCode });

  // Which contextual order actions apply, decided by the live branch/order
  // state (was computed inside ActionsCard; now drives the title-bar actions).
  // Only meaningful while the order is live and not cancelled.
  const orderActionsAvailable = Boolean(orderState) && !cancelled;
  const beforeShip = orderState?.branch === "before_ship";
  // Some items shipped, some not: the unshipped ones can still be held and the
  // shipped ones returned, so both sets of actions apply. Cancel doesn't — it
  // would cancel goods the customer already has.
  const partiallyShipped = orderState?.branch === "partially_shipped";
  const canHold = beforeShip || partiallyShipped;
  // Per-item shipping state on a split order, shared by the item list and the
  // refund modal badges.
  const shippingFor = (item) =>
    partiallyShipped ? itemShippingState(item, orderState?.lineItems ?? []) : null;
  // A return needs at least one withdrawn item that has actually shipped. On a
  // split order where the customer only picked unshipped items, there's
  // nothing to return, so the action isn't offered at all.
  const hasShippedItems =
    !partiallyShipped ||
    withdrawalRequest.items.some((item) => {
      const state = shippingFor(item);
      return state === "shipped" || state === "partlyShipped";
    });
  const holdable = (orderState?.holdableFulfillmentOrders ?? []).length > 0;
  const canRefund = Boolean(orderState?.hasRefundableItems);
  const isPending = withdrawalRequest.status === "pending";
  // Once a request is approved or rejected it's finished: every order action
  // (refund, cancel, hold, return) stays visible but disabled, so nothing can
  // change the order on a decided request. The server refuses them too.
  const actionsLocked = actionBusy || !isPending;

  // The Shopify-order-page style subtitle shown under the order number: when
  // and where the customer submitted the withdrawal, e.g.
  // "Submitted September 21, 2026 at 11:29 AM from the order status page".
  const submittedLine = t("requestDetail.submittedLine", {
    date: formatLongDateTime(withdrawalRequest.submittedAt),
    source: t(`sourceInline.${withdrawalRequest.source ?? "order_status"}`, {
      defaultValue: t("sourceInline.order_status"),
    }),
  });

  // The order's live tags, keyed as a string so the effect below only fires
  // when the actual tag list changes (e.g. after a save) — not on every
  // unrelated revalidation of orderState.
  const savedOrderTags = orderState?.tags ?? [];
  const savedOrderTagsKey = JSON.stringify(savedOrderTags);
  useEffect(() => {
    setOrderTags(savedOrderTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the serialized tag list, not array identity
  }, [savedOrderTagsKey]);

  // The tag currently typed in the field counts as a pending add (no "Add"
  // button — typing anything is enough to stage it). Commas let a merchant add
  // several at once. `stagedOrderTags` is the full set that Save will write:
  // the remaining chips plus whatever's still in the field.
  const pendingOrderTags = orderTagText
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const stagedOrderTags = [...new Set([...orderTags, ...pendingOrderTags])];

  const hasOrderTagChanges =
    JSON.stringify([...stagedOrderTags].sort()) !== JSON.stringify([...savedOrderTags].sort());

  // Shopify's native contextual save bar — mirrors the one on Form setup.
  useEffect(() => {
    if (!shopify) return;
    if (hasOrderTagChanges) {
      shopify.saveBar.show(ORDER_TAGS_SAVE_BAR_ID);
    } else {
      shopify.saveBar.hide(ORDER_TAGS_SAVE_BAR_ID);
    }
  }, [hasOrderTagChanges, shopify]);

  useEffect(() => {
    if (orderTagFetcher.state !== "idle" || !orderTagFetcher.data?.withdrawalRequest) return;
    shopify.toast.show(t("requestDetail.tags.savedToast"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the order-tag fetcher settling
  }, [orderTagFetcher.state, orderTagFetcher.data]);

  useEffect(() => {
    if (decideFetcher.state === "idle" && decideFetcher.data?.decided) {
      shopify.toast.show(
        t(`requestDetail.decidedToast.${decideFetcher.data.withdrawalRequest.status}`),
      );
      navigate("/withdrawal-requests");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the decide fetcher settling
  }, [decideFetcher.state, decideFetcher.data]);

  // Report the newest audit entry after any order action — a toast when it
  // worked, a banner when it failed — and close the money modals once their
  // action has settled.
  useEffect(() => {
    if (actionFetcher.state !== "idle" || !actionFetcher.data) return;
    // Refused before it ran (e.g. the request was decided in another tab):
    // show why in the banner instead of silently doing nothing.
    if (actionFetcher.data.error && !actionFetcher.data.withdrawalRequest) {
      setActionError(actionFetcher.data.error);
      shopify.modal.hide(REFUND_MODAL_ID);
      shopify.modal.hide(CANCEL_MODAL_ID);
      shopify.modal.hide(CREATE_RETURN_MODAL_ID);
      shopify.modal.hide(PROCESS_RETURN_MODAL_ID);
      return;
    }
    if (!actionFetcher.data.withdrawalRequest) return;
    const log = actionFetcher.data.withdrawalRequest.automation?.log ?? [];
    const last = log[log.length - 1];
    if (last?.outcome === "failed") {
      setActionError(activityMessage(last));
    } else if (last) {
      shopify.toast.show(activityMessage(last));
    }
    shopify.modal.hide(REFUND_MODAL_ID);
    shopify.modal.hide(CANCEL_MODAL_ID);
    shopify.modal.hide(CREATE_RETURN_MODAL_ID);
    shopify.modal.hide(PROCESS_RETURN_MODAL_ID);
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

  // Order tag edits stage locally — nothing is written to Shopify until
  // saveOrderTags runs, matching the Form setup save bar's behavior.
  function removeOrderTag(tag) {
    setOrderTags((current) => current.filter((existing) => existing !== tag));
  }
  function discardOrderTags() {
    setOrderTags(savedOrderTags);
    setOrderTagText("");
    shopify.saveBar.hide(ORDER_TAGS_SAVE_BAR_ID);
  }
  function saveOrderTags() {
    const added = stagedOrderTags.filter((tag) => !savedOrderTags.includes(tag));
    const removed = savedOrderTags.filter((tag) => !stagedOrderTags.includes(tag));
    orderTagFetcher.submit(
      { intent: "order-tags-save", added: JSON.stringify(added), removed: JSON.stringify(removed) },
      { method: "post" },
    );
    // Fold the typed tag into the committed chips optimistically and clear the
    // field, so the chip shows immediately instead of waiting on the reload.
    setOrderTags(stagedOrderTags);
    setOrderTagText("");
  }

  function runAction(intent) {
    setActionError(null);
    actionFetcher.submit({ intent }, { method: "post" });
  }

  function openRefund() {
    refundPreviewFetcher.submit({ intent: "refund-preview" }, { method: "post" });
    shopify.modal.show(REFUND_MODAL_ID);
  }
  function confirmRefund() {
    setActionError(null);
    actionFetcher.submit({ intent: "refund" }, { method: "post" });
  }

  function openProcessReturn() {
    returnRefundPreviewFetcher.submit({ intent: "return-refund-preview" }, { method: "post" });
    shopify.modal.show(PROCESS_RETURN_MODAL_ID);
  }
  function confirmProcessReturn() {
    setActionError(null);
    actionFetcher.submit({ intent: "process-return" }, { method: "post" });
  }

  function openCreateReturn() {
    returnPreviewFetcher.submit({ intent: "return-preview" }, { method: "post" });
    shopify.modal.show(CREATE_RETURN_MODAL_ID);
  }
  function confirmCreateReturn() {
    setActionError(null);
    actionFetcher.submit({ intent: "create-return" }, { method: "post" });
  }

  const A = "requestDetail.actions.";

  return (
    <s-page heading={withdrawalRequest.orderName}>
      {/* Badges next to the order number: request status + the order's live
          payment / fulfillment / hold / return state, mirroring Shopify's own
          order page. */}
      <s-badge slot="accessory" tone={STATUS_TONE[withdrawalRequest.status]}>
        {t(`status.${withdrawalRequest.status}`)}
      </s-badge>
      {cancelled && (
        <s-badge slot="accessory" tone="critical">
          {t("requestDetail.badges.canceled")}
        </s-badge>
      )}
      {orderState?.financialStatus && (
        <s-badge slot="accessory" tone={FINANCIAL_TONE[orderState.financialStatus] ?? "neutral"}>
          {statusLabel("financial", orderState.financialStatus)}
        </s-badge>
      )}
      {orderState?.fulfillmentStatus && (
        <s-badge slot="accessory" tone={FULFILLMENT_TONE[orderState.fulfillmentStatus] ?? "neutral"}>
          {statusLabel("fulfillment", orderState.fulfillmentStatus)}
        </s-badge>
      )}
      {hasHold && (
        <s-badge slot="accessory" tone="warning">
          {t("requestDetail.badges.onHold")}
        </s-badge>
      )}
      {returnId && (
        <s-badge slot="accessory" tone={RETURN_TONE[returnStatus] ?? "info"}>
          {t("requestDetail.badges.return", { status: statusLabel("return", returnStatus) })}
        </s-badge>
      )}
      <s-link slot="breadcrumb-actions" href="/withdrawal-requests">
        {t("requestDetail.backLink")}
      </s-link>

      {/* Order-level operations live in the title bar. Refund is surfaced as
          its own button; everything else (Cancel order, holds, returns, view)
          sits inside the More actions menu. */}
      {orderActionsAvailable && canRefund && (
        <s-button
          slot="secondary-actions"
          disabled={actionsLocked || undefined}
          onClick={openRefund}
        >
          {t(`${A}refund`)}
        </s-button>
      )}
      <s-button slot="secondary-actions" commandFor="more-actions-menu">
        {t(`${A}more`)}
      </s-button>
      <s-menu id="more-actions-menu" accessibilityLabel={t(`${A}more`)}>
        {orderActionsAvailable && beforeShip && (
          <s-button
            disabled={actionsLocked || undefined}
            onClick={() => shopify.modal.show(CANCEL_MODAL_ID)}
          >
            {t(`${A}cancelOrder`)}
          </s-button>
        )}
        {orderActionsAvailable && canHold && holdable && !hasHold && (
          <s-button disabled={actionsLocked || undefined} onClick={() => runAction("place-hold")}>
            {t(`${A}placeHold`)}
          </s-button>
        )}
        {/* Not gated on the branch or the decision: a hold this app placed
            must always be releasable. Deciding a request releases the app's
            holds, but if that release failed, this is the only way left to
            free the order, so it isn't disabled by actionsLocked. */}
        {orderActionsAvailable && hasHold && (
          <s-button disabled={actionBusy || undefined} onClick={() => runAction("release-hold")}>
            {t(`${A}releaseHold`)}
          </s-button>
        )}
        {orderActionsAvailable && !beforeShip && !returnId && hasShippedItems && (
          <s-button disabled={actionsLocked || undefined} onClick={openCreateReturn}>
            {t(`${A}createReturn`)}
          </s-button>
        )}
        {orderActionsAvailable && canProcessReturn && (
          <s-button disabled={actionsLocked || undefined} onClick={openProcessReturn}>
            {t(`${A}processReturn`)}
          </s-button>
        )}
        {shopDomain && orderNumericId && (
          <s-button href={`https://${shopDomain}/admin/orders/${orderNumericId}`} target="_blank">
            {t(`${A}viewOrder`)}
          </s-button>
        )}
      </s-menu>

      <DecisionModal
        decision={decision}
        preview={previewFetcher.data?.preview ?? null}
        loading={previewFetcher.state !== "idle"}
        deciding={deciding}
        language={customerLanguage}
        releasesHold={hasHold}
        onConfirm={confirmDecision}
      />
      <RefundModal
        items={withdrawalRequest.items}
        shippingFor={shippingFor}
        preview={previewData(refundPreviewFetcher, "refundPreview")}
        loadingPreview={refundPreviewFetcher.state !== "idle"}
        refunding={actionBusy}
        onConfirm={confirmRefund}
      />
      <ProcessReturnModal
        items={withdrawalRequest.items}
        preview={previewData(returnRefundPreviewFetcher, "returnRefundPreview")}
        loading={returnRefundPreviewFetcher.state !== "idle"}
        processing={actionBusy}
        onConfirm={confirmProcessReturn}
      />
      <CreateReturnModal
        items={withdrawalRequest.items}
        preview={previewData(returnPreviewFetcher, "returnPreview")}
        loading={returnPreviewFetcher.state !== "idle"}
        creating={actionBusy}
        onConfirm={confirmCreateReturn}
      />
      <s-modal id={CANCEL_MODAL_ID} heading={t("requestDetail.cancelModal.heading")}>
        <s-stack direction="block" gap="base" padding="base none base none">
          <s-banner tone="warning">{t("requestDetail.cancelModal.body")}</s-banner>
        </s-stack>
        <s-button slot="secondary-actions" onClick={() => shopify.modal.hide(CANCEL_MODAL_ID)}>
          {t("requestDetail.cancelModal.keep")}
        </s-button>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          loading={actionBusy || undefined}
          onClick={() => runAction("cancel-order")}
        >
          {t("requestDetail.cancelModal.confirm")}
        </s-button>
      </s-modal>

      {/* Shopify's native contextual save bar — shows automatically only
          while the staged order tags differ from what's on the order.
          Discard reverts the in-memory list; nothing is written to Shopify
          on discard. Mirrors the save bar on Form setup. */}
      <ui-save-bar id={ORDER_TAGS_SAVE_BAR_ID}>
        <button
          variant="primary"
          onClick={saveOrderTags}
          disabled={orderTagFetcher.state !== "idle" || undefined}
          loading={orderTagFetcher.state !== "idle" || undefined}
        >
          {t("common.save")}
        </button>
        <button onClick={discardOrderTags} disabled={orderTagFetcher.state !== "idle" || undefined}>
          {t("common.discard")}
        </button>
      </ui-save-bar>

      <s-button
        slot="secondary-actions"
        icon="chevron-left"
        accessibilityLabel={t("requestDetail.previous")}
        href={prevId ? `/withdrawal-requests/${prevId}` : undefined}
        disabled={!prevId}
      ></s-button>
      <s-button
        slot="secondary-actions"
        icon="chevron-right"
        accessibilityLabel={t("requestDetail.next")}
        href={nextId ? `/withdrawal-requests/${nextId}` : undefined}
        disabled={!nextId}
      ></s-button>

      <s-stack direction="block" gap="small-300">
        {/* Sits directly under the order number in the title bar — the native
            title bar has no subtitle slot in this App Bridge version, so this
            is the closest place to show when/where the request came from. */}
        <s-text color="subdued">{submittedLine}</s-text>

        {/* Page-level banners get their own group with room below, so they
            don't sit flush against the cards. Rendered only when one shows,
            so pages without a banner keep their normal spacing. */}
        {(orderStateError || actionError || cancelled) && (
          <s-stack direction="block" gap="base" padding="none none base none">
            {orderStateError && (
              <s-banner tone="warning" heading={t("requestDetail.banners.orderUnavailableHeading")}>
                {t("requestDetail.banners.orderUnavailableBody", { error: orderStateError })}
              </s-banner>
            )}

            {actionError && (
              <s-banner
                tone="critical"
                heading={t("requestDetail.banners.actionFailedHeading")}
                dismissible
                onDismiss={() => setActionError(null)}
              >
                <s-paragraph>{actionError}</s-paragraph>
                <s-paragraph>{t("requestDetail.banners.actionFailedAction")}</s-paragraph>
              </s-banner>
            )}

            {cancelled && <s-banner tone="info">{t("requestDetail.banners.canceled")}</s-banner>}
          </s-stack>
        )}

        <s-query-container>
          <s-grid gridTemplateColumns="@container (inline-size > 720px) 2fr 1fr, 1fr" gap="base" alignItems="start">
            <s-stack direction="block" gap="large-100">
              {withdrawalRequest.status !== "rejected" && (
                <DeadlineSection withdrawalRequest={withdrawalRequest} />
              )}

              {/* No `heading` prop: the card renders its own header row so the
                  Reject / Approve decision buttons can sit on the right (section
                  header action slots don't render in this App Bridge version). */}
              <s-section accessibilityLabel={t("requestDetail.items.heading")}>
                <s-stack direction="block" gap="base">
                  <s-stack
                    direction="inline"
                    justifyContent="space-between"
                    alignItems="center"
                    gap="base"
                  >
                    <s-heading>{t("requestDetail.items.heading")}</s-heading>
                    <s-stack direction="inline" gap="small-200">
                      <s-button
                        tone="critical"
                        onClick={() => openDecision("rejected")}
                        disabled={!isPending || deciding || undefined}
                      >
                        {t("requestDetail.items.reject")}
                      </s-button>
                      <s-button
                        variant="primary"
                        onClick={() => openDecision("approved")}
                        disabled={!isPending || deciding || undefined}
                        loading={deciding || undefined}
                      >
                        {t("requestDetail.items.approve")}
                      </s-button>
                    </s-stack>
                  </s-stack>

                  {partiallyShipped && (
                    <s-banner tone="info">{t("requestDetail.items.partiallyShippedBanner")}</s-banner>
                  )}
                  {withdrawalRequest.items.map((item) => (
                    <ItemRow key={item.lineId} item={item} shipping={shippingFor(item)} />
                  ))}
                  <s-divider></s-divider>
                  <s-stack direction="inline" justifyContent="space-between">
                    <s-text type="strong">{t("requestDetail.items.total")}</s-text>
                    <s-text type="strong">{formatMoney(total)}</s-text>
                  </s-stack>
                </s-stack>
              </s-section>

              {returnId && (
                <s-section heading={t("requestDetail.return.heading")}>
                  <s-stack direction="block" gap="small-200">
                    <Row label={t("requestDetail.return.status")}>
                      <s-badge tone={RETURN_TONE[returnStatus] ?? "info"}>
                        {statusLabel("return", returnStatus)}
                      </s-badge>
                    </Row>
                    {withdrawalRequest.automation?.returnCreatedAt && (
                      <Row label={t("requestDetail.return.created")}>
                        {formatDateTime(new Date(withdrawalRequest.automation.returnCreatedAt))}
                      </Row>
                    )}
                    <s-text color="subdued">
                      {canProcessReturn
                        ? t("requestDetail.return.openBody")
                        : returnOpen
                          ? t("requestDetail.return.alreadyRefundedBody")
                          : t("requestDetail.return.body")}
                    </s-text>
                    {orderActionsAvailable && canProcessReturn && (
                      <s-stack direction="inline" justifyContent="end">
                        <s-button
                          variant="primary"
                          disabled={actionsLocked || undefined}
                          onClick={openProcessReturn}
                        >
                          {t(`${A}processReturn`)}
                        </s-button>
                      </s-stack>
                    )}
                  </s-stack>
                </s-section>
              )}

              <s-section heading={t("requestDetail.payment.heading")}>
                <s-stack direction="block" gap="small-200">
                  {orderState ? (
                    <>
                      <Row label={t("requestDetail.payment.status")}>
                        <s-badge tone={FINANCIAL_TONE[orderState.financialStatus] ?? "neutral"}>
                          {statusLabel("financial", orderState.financialStatus)}
                        </s-badge>
                      </Row>
                      <s-divider></s-divider>
                      <Row label={t("requestDetail.payment.subtotal")}>{formatMoney(total)}</Row>
                      <Row label={t("requestDetail.payment.shipping")}>
                        {money(orderState.totalShipping)}
                      </Row>
                      <s-divider></s-divider>
                      <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                        <s-text type="strong">{t("requestDetail.payment.total")}</s-text>
                        <s-text type="strong">{money(orderState.totalPrice)}</s-text>
                      </s-stack>
                      {orderState.totalRefunded > 0 && (
                        <Row label={t("requestDetail.payment.refunded")}>
                          {money(orderState.totalRefunded)}
                        </Row>
                      )}
                    </>
                  ) : (
                    <s-text color="subdued">{t("requestDetail.payment.unavailable")}</s-text>
                  )}
                </s-stack>
              </s-section>

              <s-section heading={t("requestDetail.activity.heading")}>
                <s-stack direction="block" gap="base">
                  <s-grid gridTemplateColumns="1fr auto" gap="small-200" alignItems="start">
                    <s-text-field
                      label={t("requestDetail.activity.noteLabel")}
                      labelAccessibilityVisibility="exclusive"
                      placeholder={t("requestDetail.activity.notePlaceholder")}
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
                      {t("requestDetail.activity.post")}
                    </s-button>
                  </s-grid>
                  <s-text color="subdued">{t("requestDetail.activity.noteHelp")}</s-text>
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
              <s-section heading={t("requestDetail.order.heading")}>
                <s-stack direction="block" gap="small-200">
                  <Row label={t("requestDetail.order.order")}>
                    {shopDomain && orderNumericId ? (
                      <s-link href={`https://${shopDomain}/admin/orders/${orderNumericId}`} target="_blank">
                        {withdrawalRequest.orderName}
                      </s-link>
                    ) : (
                      <s-text type="strong">{withdrawalRequest.orderName}</s-text>
                    )}
                  </Row>
                  {orderState?.createdAt && (
                    <Row label={t("requestDetail.order.placed")}>
                      {formatDateTime(new Date(orderState.createdAt))}
                    </Row>
                  )}
                  {orderState && (
                    <>
                      <Row label={t("requestDetail.order.payment")}>
                        <s-badge tone={FINANCIAL_TONE[orderState.financialStatus] ?? "neutral"}>
                          {statusLabel("financial", orderState.financialStatus)}
                        </s-badge>
                      </Row>
                      <Row label={t("requestDetail.order.fulfillment")}>
                        <s-badge tone={FULFILLMENT_TONE[orderState.fulfillmentStatus] ?? "neutral"}>
                          {statusLabel("fulfillment", orderState.fulfillmentStatus)}
                        </s-badge>
                      </Row>
                    </>
                  )}
                </s-stack>
              </s-section>

              <s-section heading={t("requestDetail.customer.heading")}>
                <s-stack direction="block" gap="base">
                  <s-stack direction="inline" gap="base" alignItems="center">
                    <s-avatar
                      initials={initials(withdrawalRequest.customerName)}
                      alt={withdrawalRequest.customerName || t("requestDetail.customer.avatarFallback")}
                      size="base"
                    ></s-avatar>
                    <s-stack direction="block" gap="small-500">
                      <s-text type="strong">
                        {withdrawalRequest.customerName || t("common.emptyValue")}
                      </s-text>
                      {customerCountry && (
                        <s-stack direction="inline" gap="small-500" alignItems="center">
                          {withdrawalRequest.countryCode && (
                            <s-badge>{withdrawalRequest.countryCode}</s-badge>
                          )}
                          <s-text color="subdued">{customerCountry}</s-text>
                        </s-stack>
                      )}
                    </s-stack>
                  </s-stack>

                  <s-divider></s-divider>

                  <s-stack direction="block" gap="small-200">
                    <s-heading>{t("requestDetail.customer.contactHeading")}</s-heading>
                    <Row label={t("requestDetail.customer.email")}>
                      {withdrawalRequest.customerEmail ? (
                        <s-link href={`mailto:${withdrawalRequest.customerEmail}`}>
                          {withdrawalRequest.customerEmail}
                        </s-link>
                      ) : (
                        <s-text>{t("common.emptyValue")}</s-text>
                      )}
                    </Row>
                    {customerLanguage && (
                      <Row label={t("requestDetail.customer.language")}>{customerLanguage}</Row>
                    )}
                  </s-stack>

                  {withdrawalRequest.shippingAddress && (
                    <>
                      <s-divider></s-divider>
                      <s-stack direction="block" gap="small-200">
                        <s-heading>{t("requestDetail.customer.shippingHeading")}</s-heading>
                        <s-stack direction="block" gap="small-500">
                          {withdrawalRequest.shippingAddress
                            .split(",")
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .map((line, index) => (
                              <s-text key={index} color="subdued">{line}</s-text>
                            ))}
                        </s-stack>
                      </s-stack>
                    </>
                  )}
                </s-stack>
              </s-section>

              <s-section heading={t("requestDetail.automation.heading")}>
                <s-stack direction="block" gap="small-200">
                  <Row label={t("requestDetail.automation.stage")}>
                    {(() => {
                      const branch = withdrawalRequest.automation?.branch ?? orderState?.branch;
                      return branch
                        ? t(`requestDetail.automation.stages.${branch}`, {
                            defaultValue: humanize(branch),
                          })
                        : t("common.emptyValue");
                    })()}
                  </Row>
                  <Row label={t("requestDetail.automation.hold")}>
                    <s-badge tone={hasHold ? "warning" : "neutral"}>
                      {hasHold
                        ? t("requestDetail.automation.holdStates.onHold")
                        : withdrawalRequest.automation?.holdsReleasedAt
                          ? t("requestDetail.automation.holdStates.released")
                          : t("requestDetail.automation.holdStates.none")}
                    </s-badge>
                  </Row>
                  {withdrawalRequest.automation?.cancelledAt && (
                    <Row label={t("requestDetail.automation.canceled")}>
                      {formatDateTime(new Date(withdrawalRequest.automation.cancelledAt))}
                    </Row>
                  )}
                  {returnId && (
                    <Row label={t("requestDetail.automation.return")}>
                      <s-badge tone={RETURN_TONE[returnStatus] ?? "info"}>
                        {statusLabel("return", returnStatus)}
                      </s-badge>
                    </Row>
                  )}
                </s-stack>
              </s-section>

              <EmailHistorySection withdrawalRequest={withdrawalRequest} />

              <OrderTagsSection
                tags={orderTags}
                tagText={orderTagText}
                onTagTextChange={setOrderTagText}
                onRemove={removeOrderTag}
                disabled={!orderState || cancelled}
              />

              <s-section heading={t("requestDetail.reason.heading")}>
                <s-stack direction="block" gap="small-200">
                  <s-box background="subdued" borderRadius="base" padding="base">
                    <s-paragraph>
                      {withdrawalRequest.reason
                        ? t("requestDetail.reason.quoted", { reason: withdrawalRequest.reason })
                        : t("requestDetail.reason.none")}
                    </s-paragraph>
                  </s-box>
                </s-stack>
              </s-section>
            </s-stack>
          </s-grid>
        </s-query-container>
      </s-stack>
    </s-page>
  );
}
