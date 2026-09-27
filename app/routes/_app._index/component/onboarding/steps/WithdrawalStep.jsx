/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import OrderStatusExtensionStatus from "../../../../../components/OrderStatusExtensionStatus";
import StandalonePageStatus from "../../../../../components/StandalonePageStatus";

export default function WithdrawalStep({
  enabled,
  onEnabledChange,
  showOnOrderStatus,
  onShowOnOrderStatusChange,
  showOnStandalonePage,
  onShowOnStandalonePageChange,
}) {
  const { t } = useTranslation();

  return (
    <s-stack direction="block" gap="base">
      <s-heading>{t("onboarding.form.heading")}</s-heading>
      <s-paragraph color="subdued">{t("onboarding.form.body")}</s-paragraph>

      <s-switch
        label={t("onboarding.form.switch")}
        checked={enabled}
        onChange={(event) => onEnabledChange(event.target.checked)}
      ></s-switch>

      {enabled && (
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="small-200">
            {/* Same copy as the setup guide on Home, so both flows read as
                the same feature. */}
            <s-heading>{t("home.setupGuide.steps.form.placementHeading")}</s-heading>
            <s-paragraph color="subdued">
              {t("home.setupGuide.steps.form.placementDescription")}
            </s-paragraph>
            <s-checkbox
              label={t("placements.orderStatus.label")}
              details={t("placements.orderStatus.details")}
              checked={showOnOrderStatus}
              onChange={(event) => onShowOnOrderStatusChange(event.target.checked)}
            ></s-checkbox>
            {showOnOrderStatus && <OrderStatusExtensionStatus />}
            <s-checkbox
              label={t("placements.storefront.label")}
              details={t("placements.storefront.details")}
              checked={showOnStandalonePage}
              onChange={(event) => onShowOnStandalonePageChange(event.target.checked)}
            ></s-checkbox>
            {showOnStandalonePage && <StandalonePageStatus />}
          </s-stack>
        </s-box>
      )}

      <s-banner tone="info">
        <s-paragraph>{t("onboarding.form.later")}</s-paragraph>
      </s-banner>
    </s-stack>
  );
}
