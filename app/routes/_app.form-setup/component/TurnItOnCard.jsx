/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import ToggleRow from "./ToggleRow";

function SetupGuide({ heading, steps }) {
  return (
    <s-banner tone="info" heading={heading}>
      <s-ordered-list>
        {steps.map((step) => (
          <s-list-item key={step}>{step}</s-list-item>
        ))}
      </s-ordered-list>
    </s-banner>
  );
}

export default function TurnItOnCard({ settings, update }) {
  return (
    <s-section>
      <s-stack direction="block" gap="base">
        <ToggleRow
          title="Show the EU withdrawal form"
          description="Turns the form on for the order status page and any theme app block you&apos;ve added."
          accessibilityLabel="Show the EU withdrawal form"
          checked={settings.masterEnabled}
          onChange={(e) => update("masterEnabled", e.currentTarget.checked)}
        />

        {settings.masterEnabled ? (
          <>
            <s-divider></s-divider>

            <ToggleRow
              title="Order status page"
              description="Display the form after checkout on Shopify&apos;s order status page."
              accessibilityLabel="Order status page"
              checked={settings.showOnOrderStatus}
              onChange={(e) => update("showOnOrderStatus", e.currentTarget.checked)}
            />

            {settings.showOnOrderStatus && (
              <SetupGuide
                heading="Add it to the order status page"
                steps={[
                  "Go to Settings > Checkout in your Shopify admin.",
                  "Open the order status (thank you) page editor.",
                  'Click "Add app block", choose EU Withdrawal Form, then save.',
                ]}
              />
            )}

            <s-divider></s-divider>

            <ToggleRow
              title="Storefront theme app block"
              description={
                <>
                  Let the <s-link href="#">theme app block</s-link> you add to your storefront
                  show the form.
                </>
              }
              accessibilityLabel="Storefront theme app block"
              checked={settings.showOnThemeBlock}
              onChange={(e) => update("showOnThemeBlock", e.currentTarget.checked)}
            />

            {settings.showOnThemeBlock && (
              <SetupGuide
                heading="Add it to your theme"
                steps={[
                  "Go to Online Store > Themes in your Shopify admin.",
                  'Click "Customize" on your active theme.',
                  "Add the EU Withdrawal Form block wherever you want it to appear, then save.",
                ]}
              />
            )}
          </>
        ) : (
          <s-text color="subdued">
            Turn this on to choose where the form appears — the order status page, your theme, or
            both.
          </s-text>
        )}
      </s-stack>
    </s-section>
  );
}
