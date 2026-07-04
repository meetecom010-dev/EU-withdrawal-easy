import { useState } from "react";

export default function OnboardingFormStep() {
  const [windowDays, setWindowDays] = useState("14");

  return (
    <s-stack direction="block" gap="base">
      <s-paragraph>
        Set the withdrawal window customers have to submit a request.
      </s-paragraph>
      <s-text-field
        label="Withdrawal window (days)"
        type="number"
        value={windowDays}
        onChange={(e) => setWindowDays(e.target.value)}
      />
    </s-stack>
  );
}
