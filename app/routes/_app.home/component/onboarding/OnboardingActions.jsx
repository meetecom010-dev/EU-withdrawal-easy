/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
export default function OnboardingActions({ isFirst, isLast, onBack, onNext }) {
  return (
    <s-stack direction="inline" gap="base">
      {!isFirst && (
        <s-button variant="tertiary" onClick={onBack}>
          Back
        </s-button>
      )}
      <s-button variant="primary" onClick={onNext}>
        {isLast ? "Finish" : "Next"}
      </s-button>
    </s-stack>
  );
}
