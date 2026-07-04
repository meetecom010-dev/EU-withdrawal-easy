/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import StatsGrid from "./StatsGrid";
import SetupGuideCard from "./SetupGuideCard";
import AboutCard from "./AboutCard";

export default function Dashboard({ shopDomain, stats, setupSteps, completedCount, showSetupGuide }) {
  const [isDismissed, setIsDismissed] = useState(false);

  const stepsRemaining = setupSteps.length - completedCount;
  const isFullyCompliant = stepsRemaining === 0;
  const isSetupGuideVisible = showSetupGuide && !isDismissed;

  return (
    <s-page heading="Home">
      <s-button slot="secondary-actions" href={`https://${shopDomain}`} target="_blank">
        View storefront
      </s-button>

      <s-paragraph>
        Manage EU withdrawal requests from your customers in one place.
      </s-paragraph>

      {!isFullyCompliant && (
        <s-banner
          heading={`${stepsRemaining} step${stepsRemaining === 1 ? "" : "s"} left to finish setup`}
          tone="warning"
        >
          <s-paragraph>
            Finish the steps below so customers can submit withdrawal
            requests from your storefront.
          </s-paragraph>
        </s-banner>
      )}

      <StatsGrid stats={stats} />

      {isSetupGuideVisible ? (
        <s-grid gridTemplateColumns="2fr 1fr" gap="base">
          <SetupGuideCard
            setupSteps={setupSteps}
            completedCount={completedCount}
            onDismissed={() => setIsDismissed(true)}
          />
          <AboutCard expanded />
        </s-grid>
      ) : (
        <AboutCard />
      )}
    </s-page>
  );
}
