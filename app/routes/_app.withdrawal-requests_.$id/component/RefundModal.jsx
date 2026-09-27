/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useFormatters } from "../../../i18n/react";

export const REFUND_MODAL_ID = "refund-modal";

// Confirms the refund before it's issued. The amount is Shopify's own suggested
// refund for the withdrawn items (fetched into `preview`), so staff approve a
// real figure — refunds are irreversible. Only the withdrawn items are ever
// refunded; on a full withdrawal the original delivery charge is included too.
export default function RefundModal({ preview, loadingPreview, refunding, onConfirm }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormatters();
  const shopify = useAppBridge();
  const R = "requestDetail.refundModal.";

  const ready = preview && !preview.error && preview.refundable;
  const amountLabel = ready
    ? formatMoney({ amount: preview.amount, currencyCode: preview.currencyCode })
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
        <s-banner tone="info">{t(`${R}nothingToRefund`)}</s-banner>
      ) : (
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" justifyContent="space-between" alignItems="center">
            <s-text type="strong">{t(`${R}amount`)}</s-text>
            <s-heading>{amountLabel}</s-heading>
          </s-stack>
          <s-text color="subdued">
            {[
              t(`${R}body`),
              preview.includesShipping ? t(`${R}includesShipping`) : null,
              t(`${R}irreversible`),
            ]
              .filter(Boolean)
              .join(" ")}
          </s-text>
        </s-stack>
      )}

      <s-stack direction="inline" gap="base" alignItems="center" justifyContent="end">
        <s-button onClick={() => shopify.modal.hide(REFUND_MODAL_ID)}>{t("common.cancel")}</s-button>
        <s-button
          variant="primary"
          tone="critical"
          disabled={!ready || refunding || undefined}
          loading={refunding || undefined}
          onClick={onConfirm}
        >
          {amountLabel ? t(`${R}confirmAmount`, { amount: amountLabel }) : t(`${R}confirm`)}
        </s-button>
      </s-stack>
    </s-modal>
  );
}
