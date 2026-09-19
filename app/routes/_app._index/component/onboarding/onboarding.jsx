/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import OnboardingSidebar from "./OnboardingSidebar";
import WelcomeStep from "./steps/WelcomeStep";
import DpaStep from "./steps/DpaStep";
import WithdrawalStep from "./steps/WithdrawalStep";
import { updateOnboardingStatus } from "../../../../utils/api/shop";
import { useRefreshShop, useDismissOnboarding } from "../../../../context/ShopContext";

const STEPS = [
  { key: "welcome", title: "Welcome", description: "Overview & what's included" },
  { key: "dpa", title: "Data Agreement", description: "Accept DPA to continue" },
  { key: "form", title: "Withdrawal Form", description: "Configure your form" },
];

const PRIMARY_LABEL = ["Get started", "Continue", "Finish setup"];

export default function Onboarding({ onComplete }) {
  const shopify = useAppBridge();
  const refreshShop = useRefreshShop();
  const dismissOnboarding = useDismissOnboarding();
  const [stepIndex, setStepIndex] = useState(0);
  const [dpaAccepted, setDpaAccepted] = useState(false);
  const [formEnabled, setFormEnabled] = useState(true);
  const [showOnOrderStatus, setShowOnOrderStatus] = useState(false);
  const [showOnStandalonePage, setShowOnStandalonePage] = useState(false);

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const isPrimaryDisabled = stepIndex === 1 && !dpaAccepted;

  function notify(message) {
    shopify.toast.show(message);
  }

  async function persistOnboardingStatus() {
    try {
      await updateOnboardingStatus({ onboardingCompleted: true, dpaAccepted });
      refreshShop();
    } catch (error) {
      notify(error.message);
    }
  }

  function handleBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  async function handlePrimary() {
    if (isLast) {
      await persistOnboardingStatus();
      onComplete?.();
      notify("Setup complete — you're ready for EU withdrawals 🎉");
      return;
    }
    setStepIndex((current) => current + 1);
  }

  // On any step but the last, skip just moves past this one step. On the
  // last step, "Skip for now" instead of "Finish setup" means the merchant
  // doesn't want to commit yet — unlike the primary action, it never writes
  // onboardingCompleted to the database, only hides onboarding for the rest
  // of this session (see ShopContext's onboardingDismissed), so it comes
  // back next time the merchant opens the app.
  function handleSkip() {
    if (isLast) {
      dismissOnboarding();
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
                  showOnOrderStatus={showOnOrderStatus}
                  onShowOnOrderStatusChange={setShowOnOrderStatus}
                  showOnStandalonePage={showOnStandalonePage}
                  onShowOnStandalonePageChange={setShowOnStandalonePage}
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
