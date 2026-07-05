/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import OnboardingSidebar from "./OnboardingSidebar";
import WelcomeStep from "./steps/WelcomeStep";
import DpaStep from "./steps/DpaStep";
import WithdrawalStep from "./steps/WithdrawalStep";

const STEPS = [
  { key: "welcome", title: "Welcome", description: "Overview & what's included" },
  { key: "dpa", title: "Data Agreement", description: "Accept DPA to continue" },
  { key: "form", title: "Withdrawal Form", description: "Configure your form" },
];

const PRIMARY_LABEL = ["Get started", "Continue", "Finish setup"];

export default function Onboarding({ onComplete }) {
  const shopify = useAppBridge();
  const [stepIndex, setStepIndex] = useState(0);
  const [dpaAccepted, setDpaAccepted] = useState(false);
  const [formEnabled, setFormEnabled] = useState(true);
  const [blockAdded, setBlockAdded] = useState(false);

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const isPrimaryDisabled = stepIndex === 1 && !dpaAccepted;

  function notify(message) {
    shopify.toast.show(message);
  }

  function handleBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function handlePrimary() {
    if (isLast) {
      onComplete?.();
      notify("Setup complete — you're ready for EU withdrawals 🎉");
      return;
    }
    setStepIndex((current) => current + 1);
  }

  function handleSkip() {
    if (isLast) {
      onComplete?.();
      return;
    }
    setStepIndex((current) => current + 1);
  }

  return (
    <s-page heading="Get started">
      <s-stack direction="block" gap="large">
        <s-stack direction="block" gap="small-200" alignItems="left" mar>
          <s-heading>Let&rsquo;s get you EU compliant 👋</s-heading>
          <s-paragraph color="subdued">
            This 3-step setup will help you enable a compliant withdrawal
            process for your EU customers.
          </s-paragraph>
        </s-stack>
        <s-grid gridTemplateColumns="230px minmax(0, 1fr)" gap="base" alignItems="start">
          <OnboardingSidebar
            steps={STEPS}
            currentIndex={stepIndex}
            onOpenGuide={() => notify("Guide opens in a new tab (demo)")}
            onContactSupport={() => notify("Support chat opens (demo)")}
          />

          <s-box padding="large-100" borderWidth="base" borderRadius="large" background="base">
            <s-stack direction="block" gap="base">
              <s-badge tone="success">{`Step ${stepIndex + 1} of ${STEPS.length}`}</s-badge>

              {stepIndex === 0 && <WelcomeStep />}
              {stepIndex === 1 && (
                <DpaStep
                  accepted={dpaAccepted}
                  onAcceptedChange={setDpaAccepted}
                  onViewAgreement={() => notify("DPA opens in a new tab (demo)")}
                />
              )}
              {stepIndex === 2 && (
                <WithdrawalStep
                  enabled={formEnabled}
                  onEnabledChange={setFormEnabled}
                  blockAdded={blockAdded}
                  onBlockAddedChange={setBlockAdded}
                  onOpenCheckoutSettings={() =>
                    notify("Checkout settings open in Shopify admin (demo)")
                  }
                />
              )}

              <s-divider></s-divider>

              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                {isFirst ? (
                  <s-text></s-text>
                ) : (
                  <s-button variant="tertiary" onClick={handleBack}>
                    Back
                  </s-button>
                )}
                <s-stack direction="inline" gap="base">
                  <s-button variant="tertiary" onClick={handleSkip}>
                    Skip for now
                  </s-button>
                  <s-button
                    variant="primary"
                    onClick={handlePrimary}
                    {...(isPrimaryDisabled ? { disabled: true } : {})}
                  >
                    {PRIMARY_LABEL[stepIndex]}
                  </s-button>
                </s-stack>
              </s-stack>
            </s-stack>
          </s-box>
        </s-grid>
      </s-stack>
    </s-page>
  );
}
