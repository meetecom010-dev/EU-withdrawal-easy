/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */

const STEP_LABELS = ["Details", "Confirm", "Done"];

// Visual replacement for a plain "Step X of 3" text — a native progress bar
// plus the current step's label, so customers get an at-a-glance sense of
// how far through the withdrawal flow they are and what's left.
export default function StepProgress({ stepNumber }) {
  const label = STEP_LABELS[stepNumber - 1];

  return (
    <s-stack direction="block" gap="small-200">
      <s-stack direction="inline" justifyContent="space-between" alignItems="center">
        <s-text type="strong">{label}</s-text>
        <s-text color="subdued">
          Step {stepNumber} of {STEP_LABELS.length}
        </s-text>
      </s-stack>
      <s-progress
        value={stepNumber}
        max={STEP_LABELS.length}
        accessibilityLabel={`Step ${stepNumber} of ${STEP_LABELS.length}: ${label}`}
      ></s-progress>
    </s-stack>
  );
}
