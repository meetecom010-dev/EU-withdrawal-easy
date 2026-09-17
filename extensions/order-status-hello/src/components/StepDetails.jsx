/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import OrderItemRow from "./OrderItemRow.jsx";
import { t } from "../lib/i18n.js";

// Value for the always-appended "Other" reason. Selecting it reveals a free-text
// field; WithdrawalForm swaps this sentinel for the typed text on submit.
export const OTHER_REASON_VALUE = "__other__";

// Step 1 of 3 — pick the items to withdraw, review the (locked, pre-filled)
// legally required fields, and optionally give a reason. Mirrors the "Details"
// tab of the admin's live preview (app/routes/_app.form-setup/component/LivePreview.jsx).
export default function StepDetails({
  settings,
  lines,
  orderName,
  fullName,
  email,
  selectedLineIds,
  onToggleLine,
  reason,
  onReasonChange,
  otherReason,
  onOtherReasonChange,
  onContinue,
}) {
  const reasonOptions = settings.reasonField?.options ?? [];
  const canContinue = selectedLineIds.length > 0;

  return (
    <s-stack direction="block" gap="base">
      <s-heading>{settings.labels.step1Title}</s-heading>
      <s-paragraph color="subdued">{settings.labels.step1Description}</s-paragraph>

      <s-text type="strong">{settings.labels.itemSelectionHeading}</s-text>
      <s-stack direction="block" gap="small-200">
        {lines.map((line) => (
          <OrderItemRow
            key={line.id}
            line={line}
            checked={selectedLineIds.includes(line.id)}
            onChange={(checked) => onToggleLine(line.id, checked)}
          />
        ))}
      </s-stack>

      <s-text-field label={t("details.fullName")} value={fullName} disabled></s-text-field>
      <s-text-field label={t("details.email")} value={email} disabled></s-text-field>
      <s-text-field label={t("details.orderNumber")} value={orderName} disabled></s-text-field>

      {settings.reasonField?.enabled && (
        <>
          <s-select
            label={settings.reasonField.label}
            placeholder={t("details.reasonPlaceholder")}
            value={reason}
            onChange={(event) =>
              onReasonChange(/** @type {HTMLSelectElement} */ (event.currentTarget).value)
            }
          >
            {reasonOptions.map((option) => (
              <s-option key={option} value={option}>
                {option}
              </s-option>
            ))}
            <s-option value={OTHER_REASON_VALUE}>{t("details.otherOption")}</s-option>
          </s-select>

          {reason === OTHER_REASON_VALUE && (
            <s-text-field
              label={t("details.otherReasonLabel")}
              placeholder={t("details.otherReasonPlaceholder")}
              value={otherReason}
              onChange={(event) =>
                onOtherReasonChange(
                  /** @type {HTMLInputElement} */ (event.currentTarget).value,
                )
              }
            ></s-text-field>
          )}
        </>
      )}

      {!canContinue && (
        <s-text color="subdued">{t("details.selectItem")}</s-text>
      )}
      <s-button variant="primary" onClick={onContinue} disabled={!canContinue}>
        {settings.labels.step1ButtonLabel}
      </s-button>
    </s-stack>
  );
}
