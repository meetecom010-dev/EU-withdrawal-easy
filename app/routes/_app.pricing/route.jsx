import { useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../../shopify.server";
import { updateShopPlan } from "../../utils/api/shop";
import { useShop, useRefreshShop } from "../../context/ShopContext";
import PlanCard from "./component/PlanCard";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

// Dummy plan catalog until real billing is wired up.
const PLANS = [
  {
    name: "Free",
    price: "$0/mo",
    features: ["Up to 10 withdrawal requests/mo", "Email notifications"],
  },
  {
    name: "Starter",
    price: "$9/mo",
    features: ["Unlimited withdrawal requests", "Custom form fields", "Email notifications"],
  },
  {
    name: "Pro",
    price: "$29/mo",
    features: ["Everything in Starter", "Priority support", "Automated refunds"],
  },
];

export default function Pricing() {
  const shopify = useAppBridge();
  const shop = useShop();
  const refreshShop = useRefreshShop();
  const [currentPlan, setCurrentPlan] = useState(shop.plan.name);
  const [selecting, setSelecting] = useState(null);

  async function handleSelect(plan) {
    setSelecting(plan.name);
    try {
      const { shop: updatedShop } = await updateShopPlan({
        name: plan.name,
        price: Number(plan.price.replace(/[^0-9.]/g, "")),
      });
      setCurrentPlan(updatedShop.plan.name);
      refreshShop();
      shopify.toast.show(`Switched to ${plan.name}`);
    } catch (error) {
      shopify.toast.show(error.message, { isError: true });
    } finally {
      setSelecting(null);
    }
  }

  return (
    <s-page heading="Pricing">
      <s-grid gridTemplateColumns="1fr 1fr 1fr" gap="base">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.name}
            name={plan.name}
            price={plan.price}
            features={plan.features}
            isCurrent={currentPlan === plan.name}
            isSelecting={selecting === plan.name}
            onSelect={() => handleSelect(plan)}
          />
        ))}
      </s-grid>
    </s-page>
  );
}
