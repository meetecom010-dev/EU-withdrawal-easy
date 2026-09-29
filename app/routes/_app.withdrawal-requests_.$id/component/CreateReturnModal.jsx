/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useFormatters } from "../../../i18n/react";
import { requestTotal } from "../../_app.withdrawal-requests/constants";
import ItemRow from "./ItemRow";
import { countUnits, resolveItems } from "./itemQuantities";

export const CREATE_RETURN_MODAL_ID = "create-return-modal";

// Confirms which withdrawn items a return will cover before it's created in
// Shopify. The list comes from the server's return preview (`preview`), the
// same logic that creates the return, so it only ever shows units that have
// shipped and can still be returned. Unshipped items are left out, with one
// line saying why.
export default function CreateReturnModal({ items, preview, loading, creating, onConfirm }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormatters();
  const shopify = useAppBridge();
  const R = "requestDetail.createReturnModal.";

  const ready = Boolean(preview) && !preview.error && !loading;
  const returnItems = ready ? resolveItems(items, preview.items) : [];
  const total = requestTotal(returnItems);
  const notShipped = ready ? countUnits(preview.notShipped) : 0;
  const notReturnable = ready ? countUnits(preview.notReturnable) : 0;

  return (
    <s-modal id={CREATE_RETURN_MODAL_ID} heading={t(`${R}heading`)}>
      {loading || !preview ? (
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-spinner size="base" accessibilityLabel={t(`${R}checking`)}></s-spinner>
          <s-text color="subdued">{t(`${R}checking`)}</s-text>
        </s-stack>
      ) : preview.error ? (
        <s-banner tone="critical">{preview.error}</s-banner>
      ) : returnItems.length === 0 ? (
        <s-banner tone="info">{t(`${R}nothingToReturn`)}</s-banner>
      ) : (
        <s-stack direction="block" gap="base">
          <s-stack direction="block" gap="base">
            <s-text type="strong">{t(`${R}itemsHeading`)}</s-text>
            {returnItems.map((item) => (
              <ItemRow key={item.lineId} item={item} />
            ))}
          </s-stack>

          {total && (
            <>
              <s-divider></s-divider>
              <s-stack direction="inline" justifyContent="space-between">
                <s-text type="strong">{t(`${R}subtotal`)}</s-text>
                <s-text type="strong">{formatMoney(total)}</s-text>
              </s-stack>
            </>
          )}

          {notShipped > 0 && (
            <s-text color="subdued">{t(`${R}notShipped`, { count: notShipped })}</s-text>
          )}
          {notReturnable > 0 && (
            <s-text color="subdued">{t(`${R}notReturnable`, { count: notReturnable })}</s-text>
          )}
          <s-text color="subdued">{t(`${R}body`)}</s-text>
        </s-stack>
      )}

      {/* Footer slots: pinned below the scrolling content. */}
      <s-button
        slot="secondary-actions"
        onClick={() => shopify.modal.hide(CREATE_RETURN_MODAL_ID)}
      >
        {t(`${R}cancel`)}
      </s-button>
      <s-button
        slot="primary-action"
        variant="primary"
        disabled={!ready || returnItems.length === 0 || creating || undefined}
        loading={loading || creating || undefined}
        onClick={onConfirm}
      >
        {t(`${R}confirm`)}
      </s-button>
    </s-modal>
  );
}
