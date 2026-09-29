import { useLoaderData, useRouteError } from "react-router";
import { useTranslation } from "react-i18next";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import { getOrCreateAppSettings, serializeFormSettings } from "../../services/app-settings.server";
import { TEMPLATE_KEYS } from "../../services/email/registry";
import { AVAILABLE_LANGUAGES } from "../_app.form-setup/constants";
import { REFUND_WINDOW_DAYS } from "../_app.withdrawal-requests/constants";
import { useFormatters } from "../../i18n/react";
import { SUPPORT_EMAIL } from "../../constants";
import { FAQ_ACTIONS, FAQ_GROUPS } from "./faqs";
import FaqAccordion from "./component/FaqAccordion";

// The answers quote this shop's own deadline settings, so the FAQ always
// matches what Form setup is actually configured to do.
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { deadline } = serializeFormSettings(await getOrCreateAppSettings(session.shop));
  return {
    withdrawalDays: deadline.daysAfterDelivery,
    transitDays: deadline.estimatedTransitDays,
    // Counted here so the email registry and storefront translations stay
    // out of this page's client bundle.
    emailCount: TEMPLATE_KEYS.length,
    languageCodes: AVAILABLE_LANGUAGES.map((lang) => lang.code),
  };
};

export default function Faqs() {
  const { t } = useTranslation();
  const { languageName, formatList } = useFormatters();
  const { withdrawalDays, transitDays, emailCount, languageCodes } = useLoaderData();

  // Values the answers interpolate — settings, and the app's real email and
  // language lists — so no number in the copy is hardcoded.
  const values = {
    withdrawalDays: t("common.dayCount", { count: withdrawalDays }),
    transitDays: t("common.dayCount", { count: transitDays }),
    refundDays: t("common.dayCount", { count: REFUND_WINDOW_DAYS }),
    emailCount,
    languageCount: languageCodes.length,
    languages: formatList(languageCodes.map((code) => languageName(code))),
  };
  const groups = FAQ_GROUPS.map((group) => ({
    id: group.id,
    heading: t(`faqs.groups.${group.id}`),
    faqs: group.faqs.map((id) => ({
      id,
      ...t(`faqs.items.${id}`, { returnObjects: true, ...values }),
      action: FAQ_ACTIONS[id] ?? null,
    })),
  }));

  return (
    <s-page heading={t("faqs.pageTitle")}>
      <s-button slot="breadcrumb-actions" href="/" accessibilityLabel={t("common.backToHome")} />

      <FaqAccordion groups={groups} />

      <s-section heading={t("faqs.stillStuck.heading")}>
        <s-stack direction="block" gap="base" alignItems="start">
          <s-paragraph>{t("faqs.stillStuck.body")}</s-paragraph>
          <s-button href={`mailto:${SUPPORT_EMAIL}`}>{t("faqs.stillStuck.link")}</s-button>
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
