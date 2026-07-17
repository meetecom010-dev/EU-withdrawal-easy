import { useEffect, useState } from "react";
import { useShop } from "../context/ShopContext";
import { getCheckoutProfile } from "../utils/api/checkoutProfile";

const CHECKOUT_EDITOR_FALLBACK_URL = "shopify://admin/settings/checkout";

// Purely presentational — reads the live block status from Shop context
// instead of polling shopify.app.extensions() itself. The actual polling
// and Context/database sync happens once, app-wide, in
// app/components/OrderStatusExtensionSync.jsx. Shared by the Form Setup
// route and the onboarding withdrawal-form step.
export default function OrderStatusExtensionStatus() {
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
  const addExtensionBlockUrl =
    checkoutProfileId && storeHandle
      ? `https://admin.shopify.com/store/${storeHandle}/settings/checkout/editor/profiles/${checkoutProfileId}?page=order-status`
      : CHECKOUT_EDITOR_FALLBACK_URL;

  return (
    <s-banner tone="warning" heading="Order status page extension block not added">
      <s-stack direction="block" gap="base">
        <s-paragraph>
          Customers won&apos;t see the withdrawal form on the order status page until the
          extension block is added. Here&apos;s how:
        </s-paragraph>
        <s-ordered-list>
          <s-list-item>Go to Settings &gt; Checkout in your Shopify admin.</s-list-item>
          <s-list-item>Open the order status (thank you) page editor.</s-list-item>
          <s-list-item>Click &quot;Add app block&quot;, choose EU Withdrawal Form, then save.</s-list-item>
        </s-ordered-list>
        <s-button href={addExtensionBlockUrl} target="_blank">
          Add extension block
        </s-button>
      </s-stack>
    </s-banner>
  );
}
