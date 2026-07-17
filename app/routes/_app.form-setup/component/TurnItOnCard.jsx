/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import OrderStatusExtensionStatus from "../../../components/OrderStatusExtensionStatus";

export default function TurnItOnCard({ settings, update }) {
  return (
    <s-section>
      <s-stack direction="block" gap="small-200">
        <s-stack direction="block" gap="small-500">
          <s-heading>Enable EU Withdrawal Form</s-heading>
          <s-text color="subdued">
            Choose whether customers can access the EU Withdrawal Form on your order status page.
          </s-text>
        </s-stack>

        <s-checkbox
          label="Enable EU Withdrawal Form"
          details="Enable or disable the EU Withdrawal Form across all selected locations."
          checked={settings.masterEnabled}
          onChange={(e) => update("masterEnabled", e.currentTarget.checked)}
        ></s-checkbox>

        {settings.masterEnabled && (
          <>
            <s-divider></s-divider>
            <s-checkbox
              label="Order status page"
              details="Display the withdrawal form on Shopify's Order Status page after checkout."
              checked={settings.showOnOrderStatus}
              onChange={(e) => update("showOnOrderStatus", e.currentTarget.checked)}
            ></s-checkbox>
            {settings.showOnOrderStatus && <OrderStatusExtensionStatus />}
          </>
        )}
      </s-stack>
    </s-section>
  );
}
