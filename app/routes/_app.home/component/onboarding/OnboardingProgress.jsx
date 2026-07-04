/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
export default function OnboardingProgress({ current, total }) {
  return (
    <s-text color="subdued">
      Step {current + 1} of {total}
    </s-text>
  );
}
