/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import OnboardingCard from "./OnboardingCard";
import OnboardingProgress from "./OnboardingProgress";
import OnboardingIntroStep from "./OnboardingIntroStep";
import OnboardingDpaStep from "./OnboardingDpaStep";
import OnboardingFormStep from "./OnboardingFormStep";
import OnboardingActions from "./OnboardingActions";

const STEPS = ["intro", "dpa", "form"];

export default function Onboarding({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  function handleNext() {
    if (isLast) {
      onComplete?.();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function handleBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  return (
    <s-page heading="Get started">
      <OnboardingCard>
        <OnboardingProgress current={stepIndex} total={STEPS.length} />
        {step === "intro" && <OnboardingIntroStep />}
        {step === "dpa" && <OnboardingDpaStep />}
        {step === "form" && <OnboardingFormStep />}
        <OnboardingActions
          isFirst={isFirst}
          isLast={isLast}
          onBack={handleBack}
          onNext={handleNext}
        />
      </OnboardingCard>
    </s-page>
  );
}
