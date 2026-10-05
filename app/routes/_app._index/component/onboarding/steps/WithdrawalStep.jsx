/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import { DEFAULT_WITHDRAWAL_DAYS } from "../../../../../constants";
import OrderStatusExtensionStatus from "../../../../../components/OrderStatusExtensionStatus";
import StandalonePageStatus from "../../../../../components/StandalonePageStatus";
import { useShop } from "../../../../../context/ShopContext";

export default function WithdrawalStep({
  enabled,
  onEnabledChange,
  formRequiredError,
  showOnOrderStatus,
  onShowOnOrderStatusChange,
  showOnStandalonePage,
  onShowOnStandalonePageChange,
  placementError,
  blockError,
}) {
  const { t } = useTranslation();
  const { orderStatusBlockAdded } = useShop();
  // Built for Shopify doesn't allow two banners next to each other, so the
  // storefront setup banner waits until the order status block is added.
  const orderStatusSetupPending = showOnOrderStatus && !orderStatusBlockAdded;

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
        error={formRequiredError ? t("onboarding.form.required") : undefined}
        onChange={(event) => onEnabledChange(event.target.checked)}
      ></s-checkbox>

      {enabled && (
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="small-200">
            {/* Same copy as the setup guide on Home, so both flows read as
                the same feature. */}
            <s-heading>{t("home.setupGuide.steps.form.placementHeading")}</s-heading>
            <s-paragraph color="subdued">{t("onboarding.form.placementDescription")}</s-paragraph>
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
            {showOnStandalonePage && !orderStatusSetupPending && <StandalonePageStatus />}
            {placementError && (
              <s-text tone="critical">{t("onboarding.form.placementError")}</s-text>
            )}
            {blockError && <s-text tone="critical">{t("onboarding.form.blockError")}</s-text>}
          </s-stack>
        </s-box>
      )}
    </s-stack>
  );
}
