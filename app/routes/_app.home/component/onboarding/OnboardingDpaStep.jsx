export default function OnboardingDpaStep() {
  return (
    <s-stack direction="block" gap="base">
      <s-paragraph>
        Review and accept the Data Processing Agreement so we can process
        withdrawal requests on your behalf.
      </s-paragraph>
      <s-checkbox label="I accept the Data Processing Agreement"></s-checkbox>
    </s-stack>
  );
}
