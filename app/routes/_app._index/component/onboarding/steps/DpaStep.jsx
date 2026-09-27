/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";

export default function DpaStep({ accepted, onAcceptedChange, onViewAgreement }) {
  const { t } = useTranslation();

  return (
    <s-stack direction="block" gap="base">
      <s-heading>{t("onboarding.dpa.heading")}</s-heading>
      <s-paragraph color="subdued">{t("onboarding.dpa.body")}</s-paragraph>
      <s-link
        href="#"
        onClick={(event) => {
          event.preventDefault();
          onViewAgreement?.();
        }}
      >
        {t("onboarding.dpa.viewLink")}
      </s-link>
      <s-box padding="base" borderWidth="base" borderRadius="base">
        <s-checkbox
          label={t("onboarding.dpa.checkbox")}
          checked={accepted}
          onChange={(event) => onAcceptedChange(event.target.checked)}
        ></s-checkbox>
      </s-box>
      <s-banner tone="info">
        <s-paragraph>{t("onboarding.dpa.later")}</s-paragraph>
      </s-banner>
    </s-stack>
  );
}
