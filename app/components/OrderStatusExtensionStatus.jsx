import { useEffect, useState } from "react";
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

  return (
    <s-banner tone="warning" heading="Order status page extension block not added">
      <s-stack direction="block" gap="small-200">
        <s-paragraph>
          Customers won&apos;t see the withdrawal form on the order status page until the
          extension block is added. Here&apos;s how:
        </s-paragraph>
        <s-ordered-list>
          <s-list-item>
            Click &quot;Open checkout editor&quot; below — it opens in a new tab.
          </s-list-item>
          <s-list-item>
            In the page selector at the top of the editor, choose &quot;Order status&quot;.
          </s-list-item>
          <s-list-item>
            Click &quot;Add app block&quot; in the left sidebar, choose EU Withdrawal Form, then
            save.
          </s-list-item>
        </s-ordered-list>
        <s-paragraph color="subdued">
          This page updates automatically within a few seconds of the block being saved.
        </s-paragraph>
        <s-button href={addExtensionBlockUrl} target="_blank">
          Open checkout editor
        </s-button>
      </s-stack>
    </s-banner>
  );
}
