/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
export default function OnboardingSidebar({
  steps,
  currentIndex,
  onOpenGuide,
  onContactSupport,
}) {
  return (
    <s-stack direction="block" gap="base">
      <s-box padding="small-200" borderWidth="base" borderRadius="large" background="base">
        {steps.map((step, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <s-stack key={step.key} direction="block" gap="small-200">
              {index > 0 && <s-divider></s-divider>}
              <s-box padding="small">
                <s-grid gridTemplateColumns="auto 1fr" gap="small">
                  <s-badge tone={isDone || isCurrent ? "success" : "neutral"}>
                    {isDone ? "✓" : index + 1}
                  </s-badge>
                  <s-stack direction="block">
                    <s-text>
                      <strong>{step.title}</strong>
                    </s-text>
                    <s-text color="subdued">{step.description}</s-text>
                  </s-stack>
                </s-grid>
              </s-box>
            </s-stack>
          );
        })}
      </s-box>
      <s-box padding="base" borderWidth="base" borderRadius="large" background="base">
        <s-stack direction="inline" gap="small-200" alignItems="start">
          <s-grid gridTemplateColumns="auto 1fr" gap="small-500">
            <s-icon type="question-circle-filled" tone="critical"></s-icon>
            <s-text>
              <strong>Need help?</strong>
            </s-text>
          </s-grid>
            <s-text color="subdued">
              Read our{" "}
              <s-link
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  onOpenGuide?.();
                }}
              >
                guide
              </s-link>{" "}
              or{" "}
              <s-link
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  onContactSupport?.();
                }}
              >
                contact support
              </s-link>
              .
            </s-text>
        </s-stack>
      </s-box>
    </s-stack>
  );
}
