/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import { useFormatters } from "../../../i18n/react";

// One withdrawn line item: thumbnail, title/variant/SKU, and its price
// (already the line's total, quantity-inclusive) with the quantity withdrawn.
// Shared between the request detail page's item list and the refund modal's
// itemized breakdown.
export default function ItemRow({ item }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormatters();

  return (
    <s-stack direction="inline" gap="base" alignItems="start" justifyContent="space-between">
      <s-stack direction="inline" gap="base" alignItems="center">
        {item.imageUrl ? (
          <s-thumbnail src={item.imageUrl} alt={item.title} size="base"></s-thumbnail>
        ) : (
          <s-box
            inlineSize="40px"
            blockSize="40px"
            background="subdued"
            border="base"
            borderRadius="base"
          ></s-box>
        )}
        <s-stack direction="block" gap="small-500">
          <s-text type="strong">{item.title}</s-text>
          {item.variantTitle && <s-text color="subdued">{item.variantTitle}</s-text>}
          {item.sku && (
            <s-text color="subdued">{t("requestDetail.items.sku", { sku: item.sku })}</s-text>
          )}
        </s-stack>
      </s-stack>
      <s-stack direction="block" gap="small-500" alignItems="end">
        <s-text type="strong">{formatMoney(item.price)}</s-text>
        <s-text color="subdued">
          {t("requestDetail.items.quantity", { count: item.quantity })}
        </s-text>
      </s-stack>
    </s-stack>
  );
}
