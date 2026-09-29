/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useFormatters } from "../../../i18n/react";
import ItemRow from "./ItemRow";
import { resolveItems } from "./itemQuantities";

export const REFUND_MODAL_ID = "refund-modal";

// Confirms the refund before it's issued. The amount is Shopify's own suggested
// refund for the withdrawn items (fetched into `preview`), so staff approve a
// real figure — refunds are irreversible. Only the withdrawn items are ever
// refunded; on a full withdrawal the original delivery charge is included too.
// The item list (with price/quantity per line) and the subtotal/shipping/total
// breakdown make the math behind a multi-product withdrawal auditable at a
// glance, instead of showing a single opaque total.
// `shippingFor(item)` badges each item on a split order, so it's clear which
// refunded items have been delivered and which are simply taken off the order.
//
// The list comes from the preview (`preview.items`), not the whole request:
// units waiting in an open return are left out, because "Process and refund"
// on the return refunds those.
export default function RefundModal({
  items,
  shippingFor,
  preview,
  loadingPreview,
  refunding,
  onConfirm,
}) {
  const { t } = useTranslation();
  const { formatMoney } = useFormatters();
  const shopify = useAppBridge();
  const R = "requestDetail.refundModal.";

  // Gated on !loadingPreview too: a fetcher keeps its previous `.data` while a
  // new submission is in flight (e.g. reopening the modal re-triggers the
  // preview), so without this the button would read as ready — enabled, with
  // a stale amount — even while a fresh calculation is running.
  const ready = Boolean(preview) && !preview.error && preview.refundable && !loadingPreview;
  const totalLabel = ready
    ? formatMoney({ amount: preview.amount, currencyCode: preview.currencyCode })
    : null;
  // The subtotal is derived from Shopify's own suggested total minus shipping,
  // rather than re-summed from the request's stored item prices, so it always
  // reconciles exactly with the total shown below (and with what Shopify will
  // actually move) even if an item is no longer fully refundable.
  const shippingAmount = preview?.shippingAmount ?? 0;
  const subtotalLabel = ready
    ? formatMoney({ amount: preview.amount - shippingAmount, currencyCode: preview.currencyCode })
    : null;
  const refundItems = preview?.items ? resolveItems(items, preview.items) : items;
  const inReturn = preview?.inReturn ?? 0;
  const hasUnshippedItems = refundItems.some((item) => {
    const state = shippingFor?.(item);
    return state === "notShipped" || state === "partlyShipped";
  });
  const shippingLabel =
    ready && preview.includesShipping
      ? formatMoney({ amount: shippingAmount, currencyCode: preview.currencyCode })
      : null;

  return (
    <s-modal id={REFUND_MODAL_ID} heading={t(`${R}heading`)}>
      {loadingPreview || !preview ? (
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-spinner size="base" accessibilityLabel={t(`${R}calculatingLabel`)}></s-spinner>
          <s-text color="subdued">{t(`${R}calculating`)}</s-text>
        </s-stack>
      ) : preview.error ? (
        <s-banner tone="critical">{preview.error}</s-banner>
      ) : !preview.refundable ? (
        <s-banner tone="info">
          {inReturn > 0
            ? t(`${R}allInReturn`, { name: preview.returnName ?? "" })
            : t(`${R}nothingToRefund`)}
        </s-banner>
      ) : (
        <s-stack direction="block" gap="base">
          <s-stack direction="block" gap="base">
            <s-text type="strong">{t(`${R}itemsHeading`)}</s-text>
            {refundItems.map((item) => (
              <ItemRow key={item.lineId} item={item} shipping={shippingFor?.(item) ?? null} />
            ))}
          </s-stack>

          {inReturn > 0 && (
            <s-text color="subdued">
              {t(`${R}inReturn`, { count: inReturn, name: preview.returnName ?? "" })}
            </s-text>
          )}

          <s-divider></s-divider>

          <s-stack direction="block" gap="small-200">
            <s-stack direction="inline" justifyContent="space-between">
              <s-text color="subdued">{t(`${R}subtotal`)}</s-text>
              <s-text>{subtotalLabel}</s-text>
            </s-stack>
            {shippingLabel && (
              <s-stack direction="inline" justifyContent="space-between">
                <s-text color="subdued">{t(`${R}shippingLine`)}</s-text>
                <s-text>{shippingLabel}</s-text>
              </s-stack>
            )}
            <s-stack direction="inline" gap="base" justifyContent="space-between" alignItems="center">
              <s-text type="strong">{t(`${R}total`)}</s-text>
              <s-heading>{totalLabel}</s-heading>
            </s-stack>
          </s-stack>

          <s-text color="subdued">
            {[
              t(`${R}body`),
              hasUnshippedItems ? t(`${R}unshippedItems`) : null,
              preview.includesShipping ? t(`${R}includesShipping`) : null,
              t(`${R}irreversible`),
            ]
              .filter(Boolean)
              .join(" ")}
          </s-text>
        </s-stack>
      )}

      {/* Footer slots: pinned below the scrolling content. */}
      <s-button slot="secondary-actions" onClick={() => shopify.modal.hide(REFUND_MODAL_ID)}>
        {t("common.cancel")}
      </s-button>
      <s-button
        slot="primary-action"
        variant="primary"
        tone="critical"
        disabled={!ready || refunding || undefined}
        loading={loadingPreview || refunding || undefined}
        onClick={onConfirm}
      >
        {totalLabel ? t(`${R}confirmAmount`, { amount: totalLabel }) : t(`${R}confirm`)}
      </s-button>
    </s-modal>
  );
}
