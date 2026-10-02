import { useTranslation } from "react-i18next";
import { APP_NAME, LEGAL_MIN_WITHDRAWAL_DAYS } from "../../../../../constants";

// Copy lives in en.json under onboarding.welcome.requirements.<key>.
const LAW_ITEMS = [
  { key: "button", icon: "check-circle-filled", tone: "success" },
  { key: "twoStep", icon: "arrow-right", tone: "info" },
  { key: "email", icon: "envelope", tone: "info" },
];

export default function WelcomeStep() {
  const { t } = useTranslation();

  return (
    <s-stack direction="block" gap="large-100">
      <s-stack direction="block" gap="small-200">

        <s-query-container>
        <s-grid gridTemplateColumns="@container (inline-size > 560px) 1fr 240px, 1fr" gap="large-500">
          <s-stack gap="base">
            <s-stack direction="block" gap="small-500">
              <s-heading>{t("onboarding.welcome.heading", { appName: APP_NAME })}</s-heading>
              <s-text color="subdued">{t("onboarding.welcome.setupTime")}</s-text>
            </s-stack>
            <s-paragraph color="subdued">{t("onboarding.welcome.law")}</s-paragraph>
            <s-paragraph color="subdued">{t("onboarding.welcome.app", { appName: APP_NAME })}</s-paragraph>
          </s-stack>
          <s-stack>
            <s-image
              src="https://cdn.shopify.com/s/files/1/0766/7233/5970/files/onboarding_image.png?v=1790622585"
              alt={t("onboarding.welcome.imageAlt")}
              aspectRatio="3/2"
              objectFit="contain"
              borderRadius="base"
              inlineSize="fill"
            />
          </s-stack>
        </s-grid>
        </s-query-container>
      </s-stack>
      <s-divider></s-divider>
      <s-stack direction="block" gap="small-200">
        <s-heading>{t("onboarding.welcome.requirementsHeading")}</s-heading>
        <s-stack direction="block" gap="small-200">
          {LAW_ITEMS.map((item) => (
            <s-stack key={item.key} direction="inline" gap="small-200" alignItems="center">
              <s-icon type={item.icon} tone={item.tone}></s-icon>
              <s-text>{t(`onboarding.welcome.requirements.${item.key}`)}</s-text>
            </s-stack>
          ))}
        </s-stack>
      </s-stack>
      {/* Info, not warning: nothing is wrong with the store yet — this explains
          why setup matters. */}
      <s-banner heading={t("onboarding.welcome.penaltyHeading")} tone="info">
        <s-paragraph>
          {t("onboarding.welcome.penalty", { days: LEGAL_MIN_WITHDRAWAL_DAYS })}
        </s-paragraph>
        <s-paragraph>{t("onboarding.welcome.disclaimer")}</s-paragraph>
      </s-banner>
    </s-stack>
  );
}
