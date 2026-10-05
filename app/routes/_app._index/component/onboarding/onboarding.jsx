/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppBridge } from "@shopify/app-bridge-react";
import OnboardingSidebar from "./OnboardingSidebar";
import WelcomeStep from "./steps/WelcomeStep";
import WithdrawalStep from "./steps/WithdrawalStep";
import { updateOnboardingStatus } from "../../../../utils/api/shop";
import { saveFormSettings } from "../../../../utils/api/formSettings";
import { useShop, useRefreshShop, useDismissOnboarding } from "../../../../context/ShopContext";

// Titles/descriptions live in en.json under onboarding.steps.<key>. Steps are
// rendered by key, so adding or removing one doesn't renumber anything.
const STEPS = [{ key: "welcome" }, { key: "form" }];

// initialFormSettings comes from routes/_app.jsx's loader — null only if that
// loader's own formSettings fetch failed, which the "error" branch below
// handles (see settingsStatus).
export default function Onboarding({ onComplete, initialFormSettings }) {
  const { t } = useTranslation();
  const shopify = useAppBridge();
  const refreshShop = useRefreshShop();
  const dismissOnboarding = useDismissOnboarding();
  const [stepIndex, setStepIndex] = useState(0);
  // The form step edits real form settings: the placement boxes start from
  // what's saved, and "Finish setup" writes all three back (the same fields the
  // Home setup guide and Settings edit). The switch starts on because turning
  // the form on is what this step is for.
  const formSettings = initialFormSettings;
  const settingsStatus = initialFormSettings ? "ready" : "error";
  const [saving, setSaving] = useState(false);
  const [formEnabled, setFormEnabled] = useState(true);
  const [showOnOrderStatus, setShowOnOrderStatus] = useState(
    Boolean(initialFormSettings?.showOnOrderStatus),
  );
  const [showOnStandalonePage, setShowOnStandalonePage] = useState(
    Boolean(initialFormSettings?.showOnStandalonePage),
  );
  const [placementError, setPlacementError] = useState(false);
  const [formRequiredError, setFormRequiredError] = useState(false);
  // Block status comes from the app-wide extension sync, which re-checks every
  // few seconds, so the error clears by itself once the merchant adds the block.
  const { orderStatusBlockAdded, themeBlockAdded } = useShop();
  const blocksPending =
    (showOnOrderStatus && !orderStatusBlockAdded) || (showOnStandalonePage && !themeBlockAdded);
  const [blockErrorShown, setBlockErrorShown] = useState(false);
  // Errors show in a banner inside the step card, next to the action that
  // failed — not a toast, which disappears before the merchant can act on it.
  // `canFinishWithoutForm` adds a way forward when only the form save failed.
  const [error, setError] = useState(null);

  const currentStep = STEPS[stepIndex].key;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const isPrimaryDisabled = saving;
  const primaryLabel = isLast
    ? t("onboarding.actions.finish")
    : isFirst
      ? t("onboarding.actions.getStarted")
      : t("onboarding.actions.continue");

  function goToStep(index) {
    setError(null);
    setStepIndex(index);
  }

  function handlePlacementChange(setter) {
    return (checked) => {
      setter(checked);
      if (checked) setPlacementError(false);
      // Recheck blocks on the next "Finish setup", not instantly on toggle.
      setBlockErrorShown(false);
    };
  }

  async function finishSetup({ saveForm = true } = {}) {
    setError(null);
    const shouldSaveForm = saveForm && Boolean(formSettings);
    // Finishing means the form is on: finishing with it off would say "Setup
    // completed" while customers still can't withdraw. A merchant who doesn't
    // want it yet can use "Skip setup" instead.
    if (shouldSaveForm && !formEnabled) {
      setFormRequiredError(true);
      return;
    }
    // Turning the form on with no place picked would leave it on but hidden
    // everywhere, so ask for a place first.
    if (shouldSaveForm && !showOnOrderStatus && !showOnStandalonePage) {
      setPlacementError(true);
      return;
    }
    // A picked place without its app block still shows customers nothing.
    if (shouldSaveForm && blocksPending) {
      setBlockErrorShown(true);
      return;
    }

    setSaving(true);
    try {
      if (shouldSaveForm) {
        try {
          await saveFormSettings({
            ...formSettings,
            masterEnabled: formEnabled,
            showOnOrderStatus,
            showOnStandalonePage,
          });
        } catch {
          // Settings that fail validation (e.g. an older shop with a blank
          // label) can't be fixed from this step, so offer to finish without
          // them. The Home setup guide still shows the form step as unfinished.
          setError({ message: t("onboarding.form.saveError"), canFinishWithoutForm: true });
          return;
        }
      }

      try {
        await updateOnboardingStatus({ onboardingCompleted: true });
      } catch {
        setError({ message: t("onboarding.finishError") });
        return;
      }

      refreshShop();
      onComplete?.();
      shopify.toast.show(t("onboarding.completedToast"));
    } finally {
      setSaving(false);
    }
  }

  function handlePrimary() {
    if (isLast) {
      finishSetup();
      return;
    }
    goToStep(stepIndex + 1);
  }

  // Skipping closes onboarding for good, the same as finishing: it's only
  // shown once, after install. Anything left undone still appears in the Home
  // setup guide, which reads the real settings, so nothing is lost. The form
  // step's choices aren't saved.
  //
  // The app opens right away; the flag is saved in the background. If that
  // save fails, onboarding only stays hidden for this session and shows once
  // more next time, the same as before this was saved at all.
  function handleSkip() {
    dismissOnboarding();
    updateOnboardingStatus({ onboardingCompleted: true })
      .then(() => refreshShop())
      .catch(() => {});
  }

  return (
    <s-page heading={t("onboarding.pageTitle")}>
      <s-stack direction="block" gap="large">
        <s-stack direction="block" gap="small-500" alignItems="start">
          <s-heading>{t("onboarding.heading")}</s-heading>
          <s-paragraph color="subdued">
            {t("onboarding.intro", { count: STEPS.length })}
          </s-paragraph>
        </s-stack>
        <s-grid gridTemplateColumns="230px minmax(0, 1fr)" gap="base" alignItems="start">
          <OnboardingSidebar steps={STEPS} currentIndex={stepIndex} />

          <s-box padding="large-100" borderWidth="base" borderRadius="large" background="base">
            <s-stack direction="block" gap="base">
              <s-text color="subdued">
                {t("onboarding.stepBadge", { current: stepIndex + 1, total: STEPS.length })}
              </s-text>

              {error && (
                <s-banner tone="critical" dismissible onDismiss={() => setError(null)}>
                  <s-paragraph>{error.message}</s-paragraph>
                  {error.canFinishWithoutForm && (
                    <s-button
                      slot="secondary-actions"
                      onClick={() => finishSetup({ saveForm: false })}
                    >
                      {t("onboarding.form.finishWithoutSaving")}
                    </s-button>
                  )}
                </s-banner>
              )}

              {currentStep === "welcome" && <WelcomeStep />}
              {currentStep === "form" &&
                (settingsStatus === "error" ? (
                  <s-banner tone="critical">
                    <s-paragraph>{t("onboarding.form.loadError")}</s-paragraph>
                  </s-banner>
                ) : (
                  <WithdrawalStep
                    enabled={formEnabled}
                    onEnabledChange={(enabled) => {
                      setFormEnabled(enabled);
                      if (enabled) setFormRequiredError(false);
                      else setPlacementError(false);
                    }}
                    formRequiredError={formRequiredError}
                    showOnOrderStatus={showOnOrderStatus}
                    onShowOnOrderStatusChange={handlePlacementChange(setShowOnOrderStatus)}
                    showOnStandalonePage={showOnStandalonePage}
                    onShowOnStandalonePageChange={handlePlacementChange(setShowOnStandalonePage)}
                    placementError={placementError}
                    blockError={blockErrorShown && blocksPending}
                  />
                ))}

              <s-divider></s-divider>

              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                {isFirst ? (
                  <s-text></s-text>
                ) : (
                  <s-button variant="secondary" onClick={() => goToStep(stepIndex - 1)}>
                    {t("onboarding.actions.back")}
                  </s-button>
                )}
                <s-stack direction="inline" gap="base">
                  <s-button variant="secondary" onClick={handleSkip}>
                    {t("onboarding.actions.skip")}
                  </s-button>
                  <s-button
                    variant="primary"
                    onClick={handlePrimary}
                    loading={saving || undefined}
                    {...(isPrimaryDisabled ? { disabled: true } : {})}
                  >
                    {primaryLabel}
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
