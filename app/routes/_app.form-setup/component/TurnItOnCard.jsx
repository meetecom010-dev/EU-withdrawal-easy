/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import OrderStatusExtensionStatus from "../../../components/OrderStatusExtensionStatus";
import StandalonePageStatus from "../../../components/StandalonePageStatus";

export default function TurnItOnCard({ settings, update }) {
  return (
    <s-section heading="Enable EU Withdrawal Form">
      <s-stack direction="block" gap="small-200">
        <s-paragraph color="subdued">
          Control whether customers can submit withdrawal requests for their orders.
        </s-paragraph>

        <s-checkbox
          label="Enable withdrawal form"
          details="Offer the form to customers whose orders ship to the countries selected below."
          checked={settings.masterEnabled}
          onChange={(e) => update("masterEnabled", e.currentTarget.checked)}
        ></s-checkbox>

        {settings.masterEnabled && (
          <>
            <s-checkbox
              label="Show on order status page"
              details="Display the withdrawal form on Shopify's order status page after checkout."
              checked={settings.showOnOrderStatus}
              onChange={(e) => update("showOnOrderStatus", e.currentTarget.checked)}
            ></s-checkbox>
            {settings.showOnOrderStatus && <OrderStatusExtensionStatus />}

            <s-checkbox
              label="Show on a standalone storefront page"
              details="Let customers start a withdrawal from a dedicated page on your storefront theme, via the Withdrawly theme app extension — useful if you want the button reachable outside the order status page too."
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
