/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import OrderItemRow from "./OrderItemRow.jsx";

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

      <s-text-field label="Full name" value={fullName} disabled></s-text-field>
      <s-text-field label="Email" value={email} disabled></s-text-field>
      <s-text-field label="Order number" value={orderName} disabled></s-text-field>

      {settings.reasonField?.enabled && (
        <s-select
          label={settings.reasonField.label}
          placeholder="Select a reason (optional)"
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
        </s-select>
      )}

      {!canContinue && (
        <s-text color="subdued">Select at least one item to continue.</s-text>
      )}
      <s-button variant="primary" onClick={onContinue} disabled={!canContinue}>
        {settings.labels.step1ButtonLabel}
      </s-button>
    </s-stack>
  );
}
