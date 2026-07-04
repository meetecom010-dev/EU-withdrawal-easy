import { useEffect, useState } from "react";
import { useRouteError } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getShop, updateShopPlan, resetShopPlan } from "../utils/api/shop";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Settings() {
  const shopify = useAppBridge();
  const [shop, setShop] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadShop() {
    setLoading(true);
    const { shop } = await getShop();
    setShop(shop);
    setName(shop.plan.name);
    setPrice(String(shop.plan.price));
    setLoading(false);
  }

  useEffect(() => {
    loadShop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const { shop } = await updateShopPlan({ name, price: Number(price) });
      setShop(shop);
      shopify.toast.show("Plan updated");
    } catch (error) {
      shopify.toast.show(error.message, { isError: true });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      const { shop } = await resetShopPlan();
      setShop(shop);
      setName(shop.plan.name);
      setPrice(String(shop.plan.price));
      shopify.toast.show("Plan reset to Free");
    } catch (error) {
      shopify.toast.show(error.message, { isError: true });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <s-page heading="Settings">
        <s-paragraph>Loading...</s-paragraph>
      </s-page>
    );
  }

  return (
    <s-page heading="Settings">
      <s-section heading="Shop">
        <s-paragraph>{shop.shop}</s-paragraph>
      </s-section>

      <s-section heading="Pricing plan">
        <s-stack direction="block" gap="base">
          <s-text-field
            label="Plan name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <s-text-field
            label="Price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <s-stack direction="inline" gap="base">
            <s-button onClick={handleSave} {...(saving ? { loading: true } : {})}>
              Save
            </s-button>
            <s-button
              variant="tertiary"
              onClick={handleReset}
              {...(saving ? { loading: true } : {})}
            >
              Reset to Free
            </s-button>
          </s-stack>
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
