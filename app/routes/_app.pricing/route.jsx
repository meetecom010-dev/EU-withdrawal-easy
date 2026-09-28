import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../../shopify.server";
import { updateShopPlan } from "../../utils/api/shop";
import { useShop, useRefreshShop } from "../../context/ShopContext";
import { useFormatters } from "../../i18n/react";
import PlanCard from "./component/PlanCard";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

// Dummy plan catalog until real billing is wired up. `name` is the value
// stored on the Shop document; display names and features are
// pricing.plans.<key> in en.json.
const PLANS = [
  { key: "free", name: "Free", price: 0 },
  { key: "starter", name: "Starter", price: 9 },
  { key: "pro", name: "Pro", price: 29 },
];

const PLAN_CURRENCY = "USD";

export default function Pricing() {
  const { t } = useTranslation();
  const { formatMoney } = useFormatters();
  const shopify = useAppBridge();
  const shop = useShop();
  const refreshShop = useRefreshShop();
  const [currentPlan, setCurrentPlan] = useState(shop.plan.name);
  const [selecting, setSelecting] = useState(null);
  const [switchError, setSwitchError] = useState(null);

  async function handleSelect(plan) {
    setSelecting(plan.name);
    setSwitchError(null);
    try {
      const { shop: updatedShop } = await updateShopPlan({ name: plan.name, price: plan.price });
      setCurrentPlan(updatedShop.plan.name);
      refreshShop();
      shopify.toast.show(t("pricing.switchedToast", { plan: t(`pricing.plans.${plan.key}.name`) }));
    } catch (error) {
      setSwitchError(error.message);
    } finally {
      setSelecting(null);
    }
  }

  return (
    <s-page heading={t("pricing.pageTitle")}>
      {switchError && (
        <s-banner
          tone="critical"
          heading={t("pricing.switchError")}
          dismissible
          onDismiss={() => setSwitchError(null)}
        >
          <s-paragraph>{switchError}</s-paragraph>
        </s-banner>
      )}
      <s-grid gridTemplateColumns="1fr 1fr 1fr" gap="base">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.key}
            name={t(`pricing.plans.${plan.key}.name`)}
            price={t("pricing.pricePerMonth", {
              price: formatMoney({ amount: plan.price, currencyCode: PLAN_CURRENCY }),
            })}
            features={t(`pricing.plans.${plan.key}.features`, { returnObjects: true })}
            isCurrent={currentPlan === plan.name}
            isSelecting={selecting === plan.name}
            onSelect={() => handleSelect(plan)}
          />
        ))}
      </s-grid>
    </s-page>
  );
}
