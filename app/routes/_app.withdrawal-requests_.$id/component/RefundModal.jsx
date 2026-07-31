/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useAppBridge } from "@shopify/app-bridge-react";
import { formatMoney } from "../../_app.withdrawal-requests/constants";

export const REFUND_MODAL_ID = "refund-modal";

// Confirms the refund before it's issued. The amount is Shopify's own suggested
// refund for the withdrawn items (fetched into `preview`), so staff approve a
// real figure — refunds are irreversible. Only the withdrawn items are ever
// refunded; on a full withdrawal the original delivery charge is included too.
export default function RefundModal({ preview, loadingPreview, refunding, onConfirm }) {
  const shopify = useAppBridge();

  const ready = preview && !preview.error && preview.refundable;
  const amountLabel = ready
    ? formatMoney({ amount: preview.amount, currencyCode: preview.currencyCode })
    : null;

  return (
    <s-modal id={REFUND_MODAL_ID} heading="Refund withdrawn items">
      {loadingPreview || !preview ? (
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-spinner size="base" accessibilityLabel="Calculating refund"></s-spinner>
          <s-text color="subdued">Calculating the refund amount…</s-text>
        </s-stack>
      ) : preview.error ? (
        <s-banner tone="critical">{preview.error}</s-banner>
      ) : !preview.refundable ? (
        <s-banner tone="info">
          Nothing on this order is refundable — the withdrawn items may already be refunded or the
          order may be cancelled.
        </s-banner>
      ) : (
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" justifyContent="space-between" alignItems="center">
            <s-text type="strong">Refund amount</s-text>
            <s-heading>{amountLabel}</s-heading>
          </s-stack>
          <s-text color="subdued">
            Refunds the withdrawn items to the original payment method, restocking where Shopify
            allows.
            {preview.includesShipping
              ? " This is a full withdrawal, so the original delivery charge is included."
              : ""}{" "}
            This can&apos;t be undone.
          </s-text>
        </s-stack>
      )}

      <s-stack direction="inline" gap="base" alignItems="center" justifyContent="end">
        <s-button onClick={() => shopify.modal.hide(REFUND_MODAL_ID)}>Cancel</s-button>
        <s-button
          variant="primary"
          tone="critical"
          disabled={!ready || refunding || undefined}
          loading={refunding || undefined}
          onClick={onConfirm}
        >
          {amountLabel ? `Refund ${amountLabel}` : "Refund"}
        </s-button>
      </s-stack>
    </s-modal>
  );
}
