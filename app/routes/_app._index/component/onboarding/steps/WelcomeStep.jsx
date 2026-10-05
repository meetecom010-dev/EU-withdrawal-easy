import { useTranslation } from "react-i18next";
import { APP_NAME } from "../../../../../constants";

// What the app covers, shown as one checklist so the law is explained once.
// Copy lives in en.json under onboarding.welcome.requirements.<key>.
const REQUIREMENTS = ["button", "twoStep", "email", "manage"];

export default function WelcomeStep() {
  const { t } = useTranslation();

  return (
    <s-stack direction="block" gap="large-100">
      <s-grid gridTemplateColumns="1fr 150px" gap="large-500">
        <s-stack direction="block" gap="base">
          <s-heading>{t("onboarding.welcome.heading", { appName: APP_NAME })}</s-heading>
          <s-paragraph color="subdued">{t("onboarding.welcome.law")}</s-paragraph>
        </s-stack>
        <s-stack>
          <s-image
            src="https://cdn.shopify.com/s/files/1/0766/7233/5970/files/onboarding_image.png?v=1790622585"
            alt={t("onboarding.welcome.imageAlt", { appName: APP_NAME })}
            aspectRatio="3/2"
            objectFit="contain"
            borderRadius="base"
            inlineSize="fill"
          />
        </s-stack>
      </s-grid>
      <s-divider></s-divider>
      <s-stack direction="block" gap="small-200">
        <s-heading>{t("onboarding.welcome.requirementsHeading")}</s-heading>
        <s-stack direction="block" gap="small-200">
          {REQUIREMENTS.map((key) => (
            <s-stack key={key} direction="inline" gap="small-200" alignItems="center">
              <s-icon type="check-circle-filled" tone="success"></s-icon>
              <s-text>{t(`onboarding.welcome.requirements.${key}`)}</s-text>
            </s-stack>
          ))}
        </s-stack>
      </s-stack>
      <s-text color="subdued">{t("onboarding.welcome.disclaimer")}</s-text>
    </s-stack>
  );
}
