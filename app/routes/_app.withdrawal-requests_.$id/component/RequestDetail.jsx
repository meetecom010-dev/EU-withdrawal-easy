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
  withdrawalDeadline,
} from "../../_app.withdrawal-requests/constants";

function ItemRow({ item }) {
  return (
    <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
      <s-stack direction="inline" gap="base" alignItems="center">
        {item.imageUrl && <s-thumbnail src={item.imageUrl} alt={item.title} size="small"></s-thumbnail>}
        <s-stack direction="block" gap="small-100">
          <s-text type="strong">{item.title}</s-text>
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

// What each automation step is called in the timeline. A step with no entry
// here still shows, using its raw action name — better a slightly technical
// label than a silently missing event.
const AUTOMATION_LABEL = {
  resolve_branch: "Automation started",
  hold_fulfillment: "Fulfillment hold",
  schedule_fallback: "Scheduled follow-up",
  release_hold: "Fulfillment hold released",
  cancel_order_immediate: "Order cancelled and refunded",
  cancel_order_scheduled: "Order cancelled and refunded",
  tag_before_ship: "Order tagged",
  tag_after_delivery: "Order tagged",
  create_return: "Shopify return",
  fetch_shop_contact: "Store contact lookup",
  send_emails: "Confirmation emails",
  notify_merchant: "Merchant notified",
  run_automation: "Automation",
};

const OUTCOME_TONE = { success: "success", failed: "critical", skipped: undefined };

// Built from facts this app actually knows: submission, decision, staff notes,
// and every automation step that ran. Failed steps are shown, not hidden —
// a merchant whose return wasn't created needs the reason here rather than in
// server logs they can't reach.
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
    const label = AUTOMATION_LABEL[entry.action] ?? entry.action;
    events.push({
      key: `automation-${index}`,
      text: `${label}: ${entry.message}`,
      time: new Date(entry.at),
      tone: OUTCOME_TONE[entry.outcome],
      muted: entry.outcome === "skipped",
      // The failure detail (Shopify user errors, what was submitted vs what
      // was returnable) rendered only when there's something to explain.
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
      <s-icon
        type="check-circle"
        tone={event.tone}
        color={event.tone ? undefined : "subdued"}
      ></s-icon>
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

// Real, computed from `submittedAt`/`decidedAt` — see withdrawalDeadline's
// comment for the EU refund-window rule this reflects. Not shown for
// rejected requests since no refund is owed.
function DeadlineSection({ withdrawalRequest }) {
  const { deadline, daysLeft, overdue } = withdrawalDeadline(withdrawalRequest);
  const pending = withdrawalRequest.status === "pending";

  return (
    <s-section heading="Deadline">
      <s-stack direction="block" gap="small-200">
        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-text color="subdued">{pending ? "Decide & refund by" : "Refund deadline"}</s-text>
          <s-badge tone={overdue ? "critical" : daysLeft <= 3 ? "warning" : "success"}>
            {overdue ? "Overdue" : pending ? "Act now" : "On time"}
          </s-badge>
        </s-stack>
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

function TagsSection({ tags, tagText, onTagTextChange, onSubmitTag, onRemoveTag }) {
  return (
    <s-section heading="Order tags">
      <s-stack direction="block" gap="small-200">
        {tags.length > 0 && (
          <s-stack direction="inline" gap="small-200">
            {tags.map((tag) => (
              <s-clickable-chip
                key={tag}
                removable
                accessibilityLabel={`Remove tag ${tag}`}
                onRemove={() => onRemoveTag(tag)}
              >
                {tag}
              </s-clickable-chip>
            ))}
          </s-stack>
        )}
        <s-stack direction="inline" gap="small-200">
          <s-text-field
            label="Add tag"
            labelAccessibilityVisibility="exclusive"
            placeholder="Add tag"
            value={tagText}
            onChange={(event) => onTagTextChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmitTag();
              }
            }}
          ></s-text-field>
          <s-button onClick={onSubmitTag} disabled={!tagText.trim()}>
            + Add tag
          </s-button>
        </s-stack>
        <s-text color="subdued">
          Local to this app — tags don&apos;t sync to the order in Shopify admin.
        </s-text>
      </s-stack>
    </s-section>
  );
}

export default function RequestDetail({ withdrawalRequest, shopDomain, prevId, nextId }) {
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const decideFetcher = useFetcher();
  const noteFetcher = useFetcher();
  const tagFetcher = useFetcher();
  const [noteText, setNoteText] = useState("");
  const [tagText, setTagText] = useState("");

  const deciding = decideFetcher.state !== "idle";
  const total = requestTotal(withdrawalRequest.items);
  const type = withdrawalType(withdrawalRequest);
  const timeline = buildTimeline(withdrawalRequest);
  const orderNumericId = withdrawalRequest.orderId?.split("/").pop();

  useEffect(() => {
    if (decideFetcher.state === "idle" && decideFetcher.data?.decided) {
      shopify.toast.show(`Request marked as ${decideFetcher.data.withdrawalRequest.status}`);
      navigate("/withdrawal-requests");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the decide fetcher settling
  }, [decideFetcher.state, decideFetcher.data]);

  function decide(status) {
    decideFetcher.submit({ intent: "decide", status }, { method: "post" });
  }

  function submitNote() {
    const body = noteText.trim();
    if (!body) return;
    noteFetcher.submit({ intent: "note", body }, { method: "post" });
    setNoteText("");
  }

  function submitTag() {
    const tag = tagText.trim();
    if (!tag) return;
    tagFetcher.submit({ intent: "add-tag", tag }, { method: "post" });
    setTagText("");
  }

  function removeTag(tag) {
    tagFetcher.submit({ intent: "remove-tag", tag }, { method: "post" });
  }

  function showEvidencePackComingSoon() {
    shopify.toast.show("Evidence pack export is coming soon");
  }

  return (
    <s-page heading={withdrawalRequest.orderName}>
      <s-badge slot="accessory" tone={STATUS_TONE[withdrawalRequest.status]}>
        {STATUS_LABEL[withdrawalRequest.status]}
      </s-badge>
      <s-link
        slot="breadcrumb-actions"
        href="/withdrawal-requests"
        accessibilityLabel="Back to requests"
      ></s-link>

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
      </s-menu>
      <s-button
        slot="secondary-actions"
        tone="critical"
        onClick={() => decide("rejected")}
        disabled={withdrawalRequest.status !== "pending" || deciding}
      >
        Reject
      </s-button>
      <s-button
        slot="secondary-actions"
        variant="primary"
        onClick={() => decide("approved")}
        disabled={withdrawalRequest.status !== "pending" || deciding}
        loading={deciding || undefined}
      >
        Approve
      </s-button>
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

        {withdrawalRequest.status !== "rejected" && (
          <s-banner tone="info" heading="14-day withdrawal window">
            Under the EU right of withdrawal, refunds must be issued within 14 days of the
            withdrawal request being submitted.
          </s-banner>
        )}

        <s-grid gridTemplateColumns="2fr 1fr" gap="base">
          <s-stack direction="block" gap="large-100">
            <s-section heading="Items to withdraw">
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

            <s-section>
              <s-stack direction="block" gap="base">
                <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                  <s-heading>Timeline</s-heading>
                  <s-button icon="export" variant="tertiary" onClick={showEvidencePackComingSoon}>
                    Evidence pack
                  </s-button>
                </s-stack>
                <s-stack direction="inline" gap="small-200">
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
                  <s-button onClick={submitNote} disabled={!noteText.trim()}>
                    Post
                  </s-button>
                </s-stack>
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
                <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                  <s-text color="subdued">Name</s-text>
                  <s-stack direction="inline" gap="small-100" alignItems="center">
                    {withdrawalRequest.countryCode && <s-badge>{withdrawalRequest.countryCode}</s-badge>}
                    <s-text type="strong">{withdrawalRequest.customerName || "—"}</s-text>
                  </s-stack>
                </s-stack>
                <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                  <s-text color="subdued">Email</s-text>
                  {withdrawalRequest.customerEmail ? (
                    <s-link href={`mailto:${withdrawalRequest.customerEmail}`}>
                      {withdrawalRequest.customerEmail}
                    </s-link>
                  ) : (
                    <s-text>—</s-text>
                  )}
                </s-stack>
                <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                  <s-text color="subdued">Country</s-text>
                  <s-text>{countryName(withdrawalRequest.countryCode) || "—"}</s-text>
                </s-stack>

                {withdrawalRequest.shippingAddress && (
                  <>
                    <s-divider></s-divider>
                    <s-text color="subdued">Shipping address</s-text>
                    <s-text>{withdrawalRequest.shippingAddress}</s-text>
                  </>
                )}
              </s-stack>
            </s-section>

            <s-section heading="Reason given">
              <s-stack direction="block" gap="small-200">
                <s-box background="subdued" borderRadius="base" padding="base">
                  <s-paragraph>
                    {withdrawalRequest.reason
                      ? `"${withdrawalRequest.reason}"`
                      : "No reason given."}
                  </s-paragraph>
                </s-box>
                <s-text color="subdued">Optional field — a reason is never required.</s-text>
              </s-stack>
            </s-section>

            <TagsSection
              tags={withdrawalRequest.tags}
              tagText={tagText}
              onTagTextChange={setTagText}
              onSubmitTag={submitTag}
              onRemoveTag={removeTag}
            />
          </s-stack>
        </s-grid>
      </s-stack>
    </s-page>
  );
}
