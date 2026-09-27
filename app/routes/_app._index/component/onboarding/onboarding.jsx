/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppBridge } from "@shopify/app-bridge-react";
import OnboardingSidebar from "./OnboardingSidebar";
import WelcomeStep from "./steps/WelcomeStep";
import DpaStep from "./steps/DpaStep";
import WithdrawalStep from "./steps/WithdrawalStep";
import { updateOnboardingStatus } from "../../../../utils/api/shop";
import { useRefreshShop, useDismissOnboarding } from "../../../../context/ShopContext";

// Titles/descriptions live in en.json under onboarding.steps.<key>.
const STEPS = [{ key: "welcome" }, { key: "dpa" }, { key: "form" }];

const PRIMARY_LABEL_KEYS = [
  "onboarding.actions.getStarted",
  "onboarding.actions.continue",
  "onboarding.actions.finish",
];

export default function Onboarding({ onComplete }) {
  const { t } = useTranslation();
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

  function notify(message, options) {
    shopify.toast.show(message, options);
  }

  async function persistOnboardingStatus() {
    try {
      await updateOnboardingStatus({ onboardingCompleted: true, dpaAccepted });
      refreshShop();
    } catch (error) {
      notify(error.message, { isError: true });
    }
  }

  function handleBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  async function handlePrimary() {
    if (isLast) {
      await persistOnboardingStatus();
      onComplete?.();
      notify(t("onboarding.completedToast"));
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
    <s-page heading={t("onboarding.pageTitle")}>
      <s-stack direction="block" gap="large">
        <s-stack direction="block" gap="small-200" alignItems="left">
          <s-heading>{t("onboarding.heading")}</s-heading>
          <s-paragraph color="subdued">{t("onboarding.intro")}</s-paragraph>
        </s-stack>
        <s-grid gridTemplateColumns="230px minmax(0, 1fr)" gap="base" alignItems="start">
          <OnboardingSidebar
            steps={STEPS}
            currentIndex={stepIndex}
            // TODO: placeholders until the setup guide and support chat exist.
            onOpenGuide={() => notify(t("onboarding.help.guidePlaceholder"))}
            onContactSupport={() => notify(t("onboarding.help.supportPlaceholder"))}
          />

          <s-box padding="large-100" borderWidth="base" borderRadius="large" background="base">
            <s-stack direction="block" gap="base">
              <s-badge tone="success">
                {t("onboarding.stepBadge", { current: stepIndex + 1, total: STEPS.length })}
              </s-badge>

              {stepIndex === 0 && <WelcomeStep />}
              {stepIndex === 1 && (
                <DpaStep
                  accepted={dpaAccepted}
                  onAcceptedChange={setDpaAccepted}
                  // TODO: placeholder until the DPA document is hosted.
                  onViewAgreement={() => notify(t("onboarding.dpa.viewPlaceholder"))}
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
                    {t("onboarding.actions.back")}
                  </s-button>
                )}
                <s-stack direction="inline" gap="base">
                  <s-button variant="tertiary" onClick={handleSkip}>
                    {t("onboarding.actions.skip")}
                  </s-button>
                  <s-button
                    variant="primary"
                    onClick={handlePrimary}
                    {...(isPrimaryDisabled ? { disabled: true } : {})}
                  >
                    {t(PRIMARY_LABEL_KEYS[stepIndex])}
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
