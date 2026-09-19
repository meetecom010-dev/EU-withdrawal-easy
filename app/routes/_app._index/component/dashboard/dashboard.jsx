/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import StatsGrid from "../../../../components/StatsGrid";
import SetupGuideCard from "./SetupGuideCard";
import HelpResourcesCard from "./HelpResourcesCard";
import { useSetupGuideDismissed, useDismissSetupGuide } from "../../../../context/ShopContext";

export default function Dashboard({ shopDomain, stats, setupSteps, completedCount, showSetupGuide }) {
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
    <s-page heading="Home">
      {!isFullyCompliant && (
        <s-banner
          heading={`${stepsRemaining} step${stepsRemaining === 1 ? "" : "s"} left to finish setup`}
          tone="warning"
        >
          <s-paragraph>
            {`Still pending: ${pendingSteps.map((step) => step.label).join(", ")}. Customers can't submit withdrawal requests from your storefront until these are done.`}
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
