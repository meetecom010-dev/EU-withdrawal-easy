/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useFormatters } from "../../../i18n/react";
import { requestTotal } from "../../_app.withdrawal-requests/constants";
import ItemRow from "./ItemRow";

export const CREATE_RETURN_MODAL_ID = "create-return-modal";

// Confirms which withdrawn items a return will cover before it's created in
// Shopify. Unlike the refund modal, this doesn't move money or need a live
// Shopify preview — the request's own snapshotted items (price + quantity)
// are what the customer withdrew, and that's what's shown here.
export default function CreateReturnModal({ items, creating, onConfirm }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormatters();
  const shopify = useAppBridge();
  const R = "requestDetail.createReturnModal.";

  const total = requestTotal(items);
  const totalLabel = total ? formatMoney(total) : null;

  return (
    <s-modal id={CREATE_RETURN_MODAL_ID} heading={t(`${R}heading`)}>
      <s-stack direction="block" gap="base">
        <s-stack direction="block" gap="base">
          <s-text type="strong">{t(`${R}itemsHeading`)}</s-text>
          {items.map((item) => (
            <ItemRow key={item.lineId} item={item} />
          ))}
        </s-stack>

        {totalLabel && (
          <>
            <s-divider></s-divider>
            <s-stack direction="inline" justifyContent="space-between">
              <s-text type="strong">{t(`${R}subtotal`)}</s-text>
              <s-text type="strong">{totalLabel}</s-text>
            </s-stack>
          </>
        )}

        <s-text color="subdued">{t(`${R}body`)}</s-text>
      </s-stack>

      <s-stack direction="inline" gap="base" alignItems="center" justifyContent="end">
        <s-button onClick={() => shopify.modal.hide(CREATE_RETURN_MODAL_ID)}>
          {t(`${R}cancel`)}
        </s-button>
        <s-button
          variant="primary"
          disabled={creating || undefined}
          loading={creating || undefined}
          onClick={onConfirm}
        >
          {t(`${R}confirm`)}
        </s-button>
      </s-stack>
    </s-modal>
  );
}
