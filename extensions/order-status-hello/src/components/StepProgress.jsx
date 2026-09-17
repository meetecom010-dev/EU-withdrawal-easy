/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { t } from "../lib/i18n.js";

const STEP_KEYS = ["progress.step1", "progress.step2", "progress.step3"];
const STEP_COUNT = STEP_KEYS.length;

// Visual replacement for a plain "Step X of 3" text — a native progress bar
// plus the current step's label, so customers get an at-a-glance sense of
// how far through the withdrawal flow they are and what's left. All copy is
// translated via the extension's locale files.
export default function StepProgress({ stepNumber }) {
  const label = t(STEP_KEYS[stepNumber - 1]);

  return (
    <s-stack direction="block" gap="small-200">
      <s-stack direction="inline" justifyContent="space-between" alignItems="center">
        <s-text type="strong">{label}</s-text>
        <s-text color="subdued">
          {t("progress.stepOf", { current: stepNumber, total: STEP_COUNT })}
        </s-text>
      </s-stack>
      <s-progress
        value={stepNumber}
        max={STEP_COUNT}
        accessibilityLabel={t("progress.stepAccessibility", {
          current: stepNumber,
          total: STEP_COUNT,
          label,
        })}
      ></s-progress>
    </s-stack>
  );
}
