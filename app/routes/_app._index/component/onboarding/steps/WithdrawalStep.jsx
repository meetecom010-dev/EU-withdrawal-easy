/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import { DEFAULT_WITHDRAWAL_DAYS } from "../../../../../constants";
import OrderStatusExtensionStatus from "../../../../../components/OrderStatusExtensionStatus";
import StandalonePageStatus from "../../../../../components/StandalonePageStatus";

export default function WithdrawalStep({
  enabled,
  onEnabledChange,
  showOnOrderStatus,
  onShowOnOrderStatusChange,
  showOnStandalonePage,
  onShowOnStandalonePageChange,
  placementError,
}) {
  const { t } = useTranslation();

  return (
    <s-stack direction="block" gap="base">
      <s-heading>{t("onboarding.form.heading")}</s-heading>
      <s-paragraph color="subdued">
        {t("onboarding.form.body", {
          days: t("common.dayCount", { count: DEFAULT_WITHDRAWAL_DAYS }),
        })}
      </s-paragraph>

      <s-checkbox
        label={t("onboarding.form.switch")}
        checked={enabled}
        onChange={(event) => onEnabledChange(event.target.checked)}
      ></s-checkbox>

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
            {placementError && (
              <s-text tone="critical">{t("onboarding.form.placementError")}</s-text>
            )}
          </s-stack>
        </s-box>
      )}

      <s-paragraph color="subdued">{t("onboarding.form.later")}</s-paragraph>
    </s-stack>
  );
}
