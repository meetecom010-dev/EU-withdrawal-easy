import { useRouteError } from "react-router";
import { useTranslation } from "react-i18next";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import { FAQ_IDS } from "./faqs";
import FaqAccordion from "./component/FaqAccordion";

const SUPPORT_EMAIL = "support@withdrawaleasy.com";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

// Static content, so there's nothing to fetch and no skeleton state — the page
// is reachable from the FAQs card in Help and resources on Home.
export default function Faqs() {
  const { t } = useTranslation();
  const faqs = FAQ_IDS.map((id) => ({
    id,
    ...t(`faqs.items.${id}`, { returnObjects: true }),
  }));

  return (
    <s-page heading={t("faqs.pageTitle")}>
      <s-button slot="breadcrumb-actions" href="/" accessibilityLabel={t("common.backToHome")} />

      <s-section>
        <FaqAccordion faqs={faqs} />
      </s-section>

      <s-section heading={t("faqs.stillStuck.heading")}>
        <s-stack direction="block" gap="small-200">
          <s-text color="subdued">{t("faqs.stillStuck.body")}</s-text>
          <s-link href={`mailto:${SUPPORT_EMAIL}`}>{t("faqs.stillStuck.link")}</s-link>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
