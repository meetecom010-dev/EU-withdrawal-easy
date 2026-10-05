/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import OrderStatusExtensionStatus from "../../../components/OrderStatusExtensionStatus";
import StandalonePageStatus from "../../../components/StandalonePageStatus";
import { useShop } from "../../../context/ShopContext";

export default function TurnItOnCard({ settings, update }) {
  const { t } = useTranslation();
  const { orderStatusBlockAdded } = useShop();
  // Built for Shopify doesn't allow two banners next to each other, so the
  // storefront setup banner waits until the order status block is added.
  const orderStatusSetupPending = settings.showOnOrderStatus && !orderStatusBlockAdded;

  return (
    <s-section heading={t("formSetup.enable.heading")}>
      <s-stack direction="block" gap="small-200">
        <s-paragraph color="subdued">{t("formSetup.enable.description")}</s-paragraph>

        <s-checkbox
          label={t("formSetup.enable.checkbox")}
          details={t("formSetup.enable.details")}
          checked={settings.masterEnabled}
          onChange={(e) => update("masterEnabled", e.currentTarget.checked)}
        ></s-checkbox>

        {settings.masterEnabled && (
          <>
            <s-checkbox
              label={t("formSetup.enable.orderStatus")}
              details={t("placements.orderStatus.details")}
              checked={settings.showOnOrderStatus}
              onChange={(e) => update("showOnOrderStatus", e.currentTarget.checked)}
            ></s-checkbox>
            {settings.showOnOrderStatus && <OrderStatusExtensionStatus />}

            <s-checkbox
              label={t("formSetup.enable.storefront")}
              details={t("placements.storefront.details")}
              checked={settings.showOnStandalonePage}
              onChange={(e) => update("showOnStandalonePage", e.currentTarget.checked)}
            ></s-checkbox>
            {settings.showOnStandalonePage && !orderStatusSetupPending && (
              <StandalonePageStatus />
            )}
          </>
        )}
      </s-stack>
    </s-section>
  );
}
