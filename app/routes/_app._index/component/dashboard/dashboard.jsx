/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import StatsGrid from "../../../../components/StatsGrid";
import SetupGuideCard from "./SetupGuideCard";
import HelpResourcesCard from "./HelpResourcesCard";
import { useSetupGuideDismissed, useDismissSetupGuide } from "../../../../context/ShopContext";
import { useFormatters } from "../../../../i18n/react";

export default function Dashboard({ shopDomain, stats, setupSteps, completedCount, showSetupGuide }) {
  const { t } = useTranslation();
  const { formatList } = useFormatters();
  // Lives in ShopContext (not sessionStorage) so a dismissal survives Home
  // unmounting/remounting on tab switches, but resets on an actual page
  // reload — the guide should keep coming back until every step is done.
  const isDismissed = useSetupGuideDismissed();
  const dismissSetupGuide = useDismissSetupGuide();

  const pendingSteps = setupSteps.filter((step) => !step.complete);
  const stepsRemaining = pendingSteps.length;
  const isFullyCompliant = stepsRemaining === 0;
  const isSetupGuideVisible = showSetupGuide && !isDismissed;

  return (
    <s-page heading={t("home.pageTitle")}>
      {!isFullyCompliant && (
        <s-banner heading={t("home.setupBanner.heading", { count: stepsRemaining })} tone="warning">
          <s-paragraph>
            {t("home.setupBanner.body", {
              steps: formatList(pendingSteps.map((step) => step.label)),
            })}
          </s-paragraph>
        </s-banner>
      )}

      <StatsGrid stats={stats} />

      {isSetupGuideVisible && (
        <SetupGuideCard
          setupSteps={setupSteps}
          completedCount={completedCount}
          onDismissed={dismissSetupGuide}
        />
      )}

      <HelpResourcesCard />
    </s-page>
  );
}
