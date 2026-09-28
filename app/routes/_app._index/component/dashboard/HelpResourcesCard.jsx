/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import { SUPPORT_EMAIL } from "../../../../constants";

// TODO: add a "Help center" card (with its copy under home.help in en.json)
// once the app has a real help center URL.
const FAQ_URL = "/faqs";
const FEATURE_REQUEST_URL = "/feature-request";

function HelpCard({ title, description, linkLabel, href, external }) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small-200">
        <s-heading>{title}</s-heading>
        <s-text color="subdued">{description}</s-text>
        <s-link href={href} target={external ? "_blank" : undefined}>
          {linkLabel}
        </s-link>
      </s-stack>
    </s-box>
  );
}

export default function HelpResourcesCard() {
  const { t } = useTranslation();

  return (
    <s-section heading={t("home.help.heading")}>
      <s-grid gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))" gap="base">
        <HelpCard
          title={t("home.help.support.title")}
          description={t("home.help.support.description")}
          linkLabel={t("home.help.support.link")}
          href={`mailto:${SUPPORT_EMAIL}`}
        />
        <HelpCard
          title={t("home.help.faqs.title")}
          description={t("home.help.faqs.description")}
          linkLabel={t("home.help.faqs.link")}
          href={FAQ_URL}
        />
        <HelpCard
          title={t("home.help.featureRequest.title")}
          description={t("home.help.featureRequest.description")}
          linkLabel={t("home.help.featureRequest.link")}
          href={FEATURE_REQUEST_URL}
        />
      </s-grid>
    </s-section>
  );
}
