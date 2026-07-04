/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
export default function SetupGuideCard({ setupSteps, completedCount, onDismissed }) {
  const progressPct = Math.round((completedCount / setupSteps.length) * 100);

  return (
    <s-section heading="Setup guide">
      <s-button slot="secondary-actions" variant="tertiary" onClick={onDismissed}>
        Dismiss
      </s-button>
      <s-stack direction="block" gap="base">
        <s-text color="subdued">
          {completedCount} of {setupSteps.length} complete
        </s-text>
        <s-box background="subdued" borderRadius="base" inlineSize="100%" blockSize="6px">
          <s-box
            background="strong"
            borderRadius="base"
            inlineSize={`${progressPct}%`}
            blockSize="6px"
          ></s-box>
        </s-box>
        <s-box border="base" borderRadius="base">
          {setupSteps.map((step, index) => (
            <s-stack key={step.key} direction="block" gap="small-200">
              {index > 0 && <s-divider></s-divider>}
              <s-box padding="small">
                <s-stack direction="block" gap="small-200">
                  <s-checkbox label={step.label} checked={step.complete} disabled></s-checkbox>
                  <s-paragraph color="subdued">{step.description}</s-paragraph>
                </s-stack>
              </s-box>
            </s-stack>
          ))}
        </s-box>
      </s-stack>
    </s-section>
  );
}
