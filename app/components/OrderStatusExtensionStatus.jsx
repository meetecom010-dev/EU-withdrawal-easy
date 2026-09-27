import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useShop } from "../context/ShopContext";
import { getCheckoutProfile } from "../utils/api/checkoutProfile";

// Only used if the shop domain is somehow missing from context — a real
// https URL is required because the button opens in a new tab, and a new
// tab can't resolve the shopify:// app-bridge protocol.
const CHECKOUT_EDITOR_FALLBACK_URL = "https://admin.shopify.com/settings/checkout";

// Purely presentational — reads the live block status from Shop context
// instead of polling shopify.app.extensions() itself. The actual polling
// and Context/database sync happens once, app-wide, in
// app/components/OrderStatusExtensionSync.jsx. Shared by the Form Setup
// route and the onboarding withdrawal-form step.
export default function OrderStatusExtensionStatus() {
  const { t } = useTranslation();
  const { shop, orderStatusBlockAdded } = useShop();
  const [checkoutProfileId, setCheckoutProfileId] = useState(null);

  // Fetched once — used to deep link straight to the live checkout profile
  // in the checkout & accounts editor instead of just the editor's landing page.
  useEffect(() => {
    if (orderStatusBlockAdded) {
      return;
    }
    getCheckoutProfile()
      .then(({ checkoutProfileId: id }) => setCheckoutProfileId(id))
      .catch(() => setCheckoutProfileId(null));
  }, [orderStatusBlockAdded]);

  if (orderStatusBlockAdded) {
    return null;
  }

  const storeHandle = shop?.replace(/\.myshopify\.com$/, "");
  // Shopify has no documented deep link that lands directly on the Order
  // status page. ?page=order-status is passed in case the admin honors it,
  // but unknown ?page= values just silently redirect to the editor's first
  // checkout step — so the steps below still walk the merchant to the Order
  // status page via the editor's page selector.
  const addExtensionBlockUrl = storeHandle
    ? checkoutProfileId
      ? `https://admin.shopify.com/store/${storeHandle}/settings/checkout/editor/profiles/${checkoutProfileId}?page=order-status`
      : `https://admin.shopify.com/store/${storeHandle}/settings/checkout`
    : CHECKOUT_EDITOR_FALLBACK_URL;

  // Step names must match what the checkout editor shows — "Withdrawal form"
  // is the extension name from extensions/withdrawal-order-status's toml.
  const steps = ["open", "add", "choose", "save"];

  return (
    <s-banner tone="warning" heading={t("blockSetup.orderStatus.heading")}>
      <s-stack direction="block" gap="small-200">
        <s-paragraph>{t("blockSetup.orderStatus.body")}</s-paragraph>
        <s-ordered-list>
          {steps.map((step) => (
            <s-list-item key={step}>
              <Trans
                i18nKey={`blockSetup.orderStatus.steps.${step}`}
                components={{ strong: <s-text type="strong" /> }}
              />
            </s-list-item>
          ))}
        </s-ordered-list>
        <s-paragraph color="subdued">{t("blockSetup.autoUpdate")}</s-paragraph>
        <s-button href={addExtensionBlockUrl} target="_blank">
          {t("blockSetup.addAppBlock")}
        </s-button>
      </s-stack>
    </s-banner>
  );
}
