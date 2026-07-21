/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "preact/hooks";
import OrderItemRow from "./OrderItemRow.jsx";
import { formatMoney, sumMoney } from "../lib/money.js";

// Step 2 of 3 — review the selected items, accept the withdrawal
// declaration, and confirm. Submit stays disabled until the declaration is
// checked, and if nothing is selected (defensive: selection is already
// required to reach this step, but the underlying order lines are a live
// signal and could change while the customer is on this step). The
// declaration resets when the customer navigates back — re-confirming after
// changing the selection is intentional.
export default function StepConfirm({
  settings,
  lines,
  selectedLineIds,
  onPrevious,
  onSubmit,
  submitting,
  error,
}) {
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const selectedLines = lines.filter((line) => selectedLineIds.includes(line.id));
  const canSubmit = selectedLines.length > 0 && declarationAccepted;
  const total = sumMoney(selectedLines.map((line) => line.cost?.totalAmount));

  return (
    <s-stack direction="block" gap="base">
      <s-heading>{settings.labels.confirmHeading}</s-heading>
      <s-paragraph color="subdued">{settings.labels.confirmMessage}</s-paragraph>

      <s-text type="strong">
        Items to withdraw ({selectedLines.length})
      </s-text>
      <s-stack direction="block" gap="small-200">
        {selectedLines.map((line) => (
          <OrderItemRow key={line.id} line={line} readOnly />
        ))}
      </s-stack>

      {total && (
        <>
          <s-divider></s-divider>
          <s-stack direction="inline" gap="base" justifyContent="space-between">
            <s-text type="strong">Selected items total</s-text>
            <s-text type="strong">{formatMoney(total)}</s-text>
          </s-stack>
        </>
      )}

      <s-checkbox
        label={settings.labels.declaration}
        checked={declarationAccepted}
        onChange={(event) =>
          setDeclarationAccepted(/** @type {HTMLInputElement} */ (event.currentTarget).checked)
        }
      ></s-checkbox>

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
