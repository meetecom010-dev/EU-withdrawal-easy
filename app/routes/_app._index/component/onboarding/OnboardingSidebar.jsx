/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { Trans, useTranslation } from "react-i18next";
import { SUPPORT_EMAIL } from "../../../../constants";

// Badge tone shows where each step stands: done (success), current (info),
// still ahead (neutral).
function stepTone(index, currentIndex) {
  if (index < currentIndex) return "success";
  if (index === currentIndex) return "info";
  return "neutral";
}

export default function OnboardingSidebar({ steps, currentIndex }) {
  const { t } = useTranslation();

  return (
    <s-stack direction="block" gap="base">
      <s-box padding="small-200" borderWidth="base" borderRadius="large" background="base">
        {steps.map((step, index) => {
          const isDone = index < currentIndex;

          return (
            <s-stack key={step.key} direction="block" gap="small-200">
              {index > 0 && <s-divider></s-divider>}
              <s-box padding="small">
                <s-grid gridTemplateColumns="auto 1fr" gap="small">
                  <s-badge tone={stepTone(index, currentIndex)}>
                    {isDone ? "✓" : index + 1}
                  </s-badge>
                  <s-stack direction="block">
                    <s-text>
                      <strong>{t(`onboarding.steps.${step.key}.title`)}</strong>
                    </s-text>
                    <s-text color="subdued">
                      {t(`onboarding.steps.${step.key}.description`)}
                    </s-text>
                  </s-stack>
                </s-grid>
              </s-box>
            </s-stack>
          );
        })}
      </s-box>

      <s-box padding="base" borderWidth="base" borderRadius="large" background="base">
        <s-stack direction="block" gap="small-200">
          <s-grid gridTemplateColumns="auto 1fr" gap="small-500" alignItems="center">
            <s-icon type="question-circle"></s-icon>
            <s-text>
              <strong>{t("onboarding.help.heading")}</strong>
            </s-text>
          </s-grid>
          <s-text color="subdued">
            <Trans
              i18nKey="onboarding.help.body"
              components={{ supportLink: <s-link href={`mailto:${SUPPORT_EMAIL}`} /> }}
            />
          </s-text>
        </s-stack>
      </s-box>
    </s-stack>
  );
}
