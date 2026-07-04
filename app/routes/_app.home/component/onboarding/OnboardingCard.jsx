/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
export default function OnboardingCard({ children }) {
  return (
    <s-section heading="Setup wizard">
      <s-stack direction="block" gap="base">
        {children}
      </s-stack>
    </s-section>
  );
}
