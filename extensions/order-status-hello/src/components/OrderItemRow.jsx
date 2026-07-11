/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { formatMoney } from "../lib/money.js";

// A single order line: checkbox + thumbnail + title + price. Used both as an
// interactive picker (details step) and as a read-only summary row (confirm
// and done steps, via `readOnly`).
/**
 * @param {{
 *   line: object,
 *   checked?: boolean,
 *   onChange?: (checked: boolean) => void,
 *   readOnly?: boolean,
 * }} props
 */
export default function OrderItemRow({ line, checked = false, onChange = () => {}, readOnly = false }) {
  const title = line.merchandise?.title ?? "Item";
  const image = line.merchandise?.image;
  const price = formatMoney(line.cost?.totalAmount);

  const thumbnailAndTitle = (
    <s-stack direction="inline" gap="base" alignItems="center">
      <s-product-thumbnail
        src={image?.url}
        alt={image?.altText ?? title}
        size="small"
      ></s-product-thumbnail>
      <s-stack direction="block" gap="small-100">
        <s-text type="strong">{title}</s-text>
        {line.quantity > 1 && <s-text color="subdued">Qty {line.quantity}</s-text>}
      </s-stack>
    </s-stack>
  );

  return (
    <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
      <s-stack direction="inline" gap="base" alignItems="center">
        {!readOnly && (
          <s-checkbox
            label=""
            accessibilityLabel={title}
            checked={checked}
            onChange={(event) =>
              onChange(/** @type {HTMLInputElement} */ (event.currentTarget).checked)
            }
          ></s-checkbox>
        )}
        {readOnly ? (
          thumbnailAndTitle
        ) : (
          // Lets customers toggle by tapping the product info too, not just
          // the small checkbox target — the checkbox itself stays a
          // separate, independently focusable control (no nested
          // interactive elements).
          <s-clickable
            accessibilityLabel={`${checked ? "Remove" : "Select"} ${title}`}
            background={checked ? "subdued" : "transparent"}
            borderRadius="base"
            padding="small-200"
            onClick={() => onChange(!checked)}
          >
            {thumbnailAndTitle}
          </s-clickable>
        )}
      </s-stack>
      <s-text color="subdued">{price}</s-text>
    </s-stack>
  );
}
