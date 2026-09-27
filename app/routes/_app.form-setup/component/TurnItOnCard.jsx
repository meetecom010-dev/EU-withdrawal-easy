/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import OrderStatusExtensionStatus from "../../../components/OrderStatusExtensionStatus";
import StandalonePageStatus from "../../../components/StandalonePageStatus";

export default function TurnItOnCard({ settings, update }) {
  const { t } = useTranslation();

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
            {settings.showOnStandalonePage && <StandalonePageStatus />}
          </>
        )}
      </s-stack>
    </s-section>
  );
}
