/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import OrderItemRow from "./OrderItemRow.jsx";

// Step 2 of 3 — review the selected items and confirm. Submit stays disabled
// if nothing is selected (defensive: selection is already required to reach
// this step, but the underlying order lines are a live signal and could
// change while the customer is on this step).
export default function StepConfirm({
  settings,
  lines,
  selectedLineIds,
  onPrevious,
  onSubmit,
  submitting,
  error,
}) {
  const selectedLines = lines.filter((line) => selectedLineIds.includes(line.id));
  const canSubmit = selectedLines.length > 0;

  return (
    <s-stack direction="block" gap="base">
      <s-heading>{settings.labels.confirmHeading}</s-heading>
      <s-paragraph color="subdued">{settings.labels.confirmMessage}</s-paragraph>

      <s-text type="strong">Items to withdraw</s-text>
      <s-stack direction="block" gap="small-200">
        {selectedLines.map((line) => (
          <OrderItemRow key={line.id} line={line} readOnly />
        ))}
      </s-stack>

      <s-paragraph color="subdued">{settings.labels.declaration}</s-paragraph>

      {error && <s-banner tone="critical">{error}</s-banner>}

      <s-stack direction="inline" gap="base" justifyContent="space-between">
        <s-button onClick={onPrevious} disabled={submitting || undefined}>
          Previous
        </s-button>
        <s-button
          variant="primary"
          onClick={onSubmit}
          disabled={!canSubmit}
          loading={submitting || undefined}
        >
          {settings.labels.confirmButtonLabel}
        </s-button>
      </s-stack>
    </s-stack>
  );
}
