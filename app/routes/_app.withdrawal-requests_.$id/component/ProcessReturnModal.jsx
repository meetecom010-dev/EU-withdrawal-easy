/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useFormatters } from "../../../i18n/react";
import ItemRow from "./ItemRow";
import { atQuantity } from "./itemQuantities";

export const PROCESS_RETURN_MODAL_ID = "process-return-modal";

// A return line shown with the request's snapshot of that item (image, SKU,
// price) when it can be matched, the same way the automation matched it when
// creating the return. Falls back to Shopify's title alone.
function toItemRow(line, items) {
  const item =
    (line.variantId && items.find((candidate) => candidate.variantId === line.variantId)) ||
    items.find((candidate) => candidate.lineId === line.lineItemId);
  return item
    ? atQuantity(item, line.quantity)
    : { lineId: line.id, title: line.title, quantity: line.quantity, price: null };
}

// Confirms "Process and refund" on the return: the same one-step action as the
// button on Shopify's order page. Lists the returned units still to process
// and Shopify's suggested refund for them (`preview`), then processes the
// return, refunds the customer and closes it.
export default function ProcessReturnModal({ items, preview, loading, processing, onConfirm }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormatters();
  const shopify = useAppBridge();
  const R = "requestDetail.processReturnModal.";

  // Nothing to refund (the items were refunded some other way) counts as not
  // ready: the dialog explains instead of offering a "Refund €0.00".
  const ready =
    Boolean(preview) &&
    !preview.error &&
    preview.processable &&
    preview.amount > 0 &&
    preview.refundSupported !== false &&
    !loading;
  const rows = ready ? preview.lines.map((line) => toItemRow(line, items)) : [];
  const money = (amount) => formatMoney({ amount, currencyCode: preview?.currencyCode });
  const totalLabel = ready ? money(preview.amount) : null;

  return (
    <s-modal id={PROCESS_RETURN_MODAL_ID} heading={t(`${R}heading`)}>
      {loading || !preview ? (
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-spinner size="base" accessibilityLabel={t(`${R}calculating`)}></s-spinner>
          <s-text color="subdued">{t(`${R}calculating`)}</s-text>
        </s-stack>
      ) : preview.error ? (
        <s-banner tone="critical">{preview.error}</s-banner>
      ) : !preview.processable ? (
        <s-banner tone="info">{t(`${R}nothingToProcess`)}</s-banner>
      ) : !(preview.amount > 0) ? (
        <s-banner tone="info">{t(`${R}nothingToRefund`)}</s-banner>
      ) : preview.refundSupported === false ? (
        <s-banner tone="warning">{t(`${R}unsupportedPayment`)}</s-banner>
      ) : (
        <s-stack direction="block" gap="base">
          <s-stack direction="block" gap="base">
            <s-text type="strong">
              {t(`${R}itemsHeading`, { name: preview.name ?? "" })}
            </s-text>
            {rows.map((item) => (
              <ItemRow key={item.lineId} item={item} />
            ))}
          </s-stack>

          <s-divider></s-divider>

          <s-stack direction="block" gap="small-200">
            {preview.includesShipping && (
              <>
                <s-stack direction="inline" justifyContent="space-between">
                  <s-text color="subdued">{t(`${R}subtotal`)}</s-text>
                  <s-text>{money(preview.amount - preview.shippingAmount)}</s-text>
                </s-stack>
                <s-stack direction="inline" justifyContent="space-between">
                  <s-text color="subdued">{t(`${R}shippingLine`)}</s-text>
                  <s-text>{money(preview.shippingAmount)}</s-text>
                </s-stack>
              </>
            )}
            <s-stack direction="inline" gap="base" justifyContent="space-between" alignItems="center">
              <s-text type="strong">{t(`${R}total`)}</s-text>
              <s-heading>{totalLabel}</s-heading>
            </s-stack>
          </s-stack>

          <s-text color="subdued">{t(`${R}body`)}</s-text>
        </s-stack>
      )}

      {/* Footer slots: pinned below the scrolling content. */}
      <s-button slot="secondary-actions" onClick={() => shopify.modal.hide(PROCESS_RETURN_MODAL_ID)}>
        {t("common.cancel")}
      </s-button>
      <s-button
        slot="primary-action"
        variant="primary"
        tone="critical"
        disabled={!ready || processing || undefined}
        loading={loading || processing || undefined}
        onClick={onConfirm}
      >
        {totalLabel ? t(`${R}confirmAmount`, { amount: totalLabel }) : t(`${R}confirm`)}
      </s-button>
    </s-modal>
  );
}
