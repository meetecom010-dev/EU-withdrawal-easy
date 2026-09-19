import { useEffect, useState } from "react";
import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../../shopify.server";
import { useShop, usePatchShop } from "../../context/ShopContext";
import { getDashboardStats } from "../../utils/api/dashboardStats";
import { getFormSettings, saveFormSettings } from "../../utils/api/formSettings";
import { updateDpaAccepted } from "../../utils/api/shop";
import Dashboard from "./component/dashboard/dashboard";
import DashboardSkeleton from "./component/dashboard/DashboardSkeleton";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

// Builds the setup-guide steps from real, live state instead of a hardcoded
// guess. Order matters here — it's the order a merchant should reasonably
// complete them in: accept the DPA, turn the form on and pick where it shows,
// then add the block(s) for whichever surfaces were picked. dpa/form/the
// two placement checkboxes are directly actionable right in the guide (see
// onToggle); the "blocks" step isn't — whether a block is actually placed
// can only be observed live via *ExtensionSync, not set by checking a box,
// so those checkboxes are status indicators, not controls (see
// SetupGuideCard.jsx).
function buildSetupSteps({
  dpaAccepted,
  formEnabled,
  showOnOrderStatus,
  showOnStandalonePage,
  orderStatusBlockAdded,
  themeBlockAdded,
  onDpaToggle,
  onFormToggle,
  onToggleOrderStatus,
  onToggleStandalone,
}) {
  // Only surfaces the merchant actually picked get a block-setup entry —
  // otherwise the final step would show an unavoidable, always-incomplete
  // task for a surface nobody asked for.
  const blockSurfaces = [
    ...(showOnOrderStatus
      ? [{ key: "orderStatus", label: "Order Status Page", added: Boolean(orderStatusBlockAdded) }]
      : []),
    ...(showOnStandalonePage
      ? [{ key: "theme", label: "Theme Block", added: Boolean(themeBlockAdded) }]
      : []),
  ];

  return [
    {
      key: "dpa",
      label: "Accept the Data Processing Agreement",
      description: "Required before we can process withdrawal requests on your behalf.",
      complete: Boolean(dpaAccepted),
      checkboxLabel: "I accept the Data Processing Agreement",
      onToggle: onDpaToggle,
    },
    {
      key: "form",
      label: "Configure your withdrawal form",
      description:
        "Turns the form on and picks where customers see it. Sensible defaults are already filled in — customize the fields, reasons and wording anytime from Form Setup.",
      complete: Boolean(formEnabled),
      checkboxLabel: "Enable the withdrawal form",
      // Renders as a switch, not a checkbox — matches the onboarding
      // wizard's WithdrawalStep, which this step mirrors.
      useSwitch: true,
      onToggle: onFormToggle,
      ctaLabel: "Go to Form Setup",
      ctaHref: "/form-setup",
      // Where to show it — a merchant can pick one or both. The next step
      // (blockSurfaces above) only shows setup instructions for what's
      // picked here. Heading/description/details copy matches
      // onboarding/steps/WithdrawalStep.jsx so the two flows read as the
      // same feature.
      placementHeading: "Show it on your storefront",
      placementDescription:
        "The button needs to be placed on the order status page before customers can see it.",
      placementOptions: [
        {
          key: "orderStatus",
          label: "Order status page",
          details: "Display the withdrawal form on Shopify's Order Status page after checkout.",
          checked: Boolean(showOnOrderStatus),
          onToggle: onToggleOrderStatus,
        },
        {
          key: "theme",
          label: "Standalone storefront page",
          details:
            "Let customers start a withdrawal from a dedicated page on your storefront theme, via the Withdrawly theme app extension.",
          checked: Boolean(showOnStandalonePage),
          onToggle: onToggleStandalone,
        },
      ],
    },
    ...(blockSurfaces.length > 0
      ? [
          {
            key: "blocks",
            label: "Add the required app blocks",
            description: "Add the block for each place you chose above.",
            complete: blockSurfaces.some((surface) => surface.added),
            surfaces: blockSurfaces,
          },
        ]
      : []),
  ];
}

// This route only renders once routes/_app.jsx has confirmed onboarding is
// complete OR dismissed for the session — a merchant can land here without
// ever having accepted the DPA or turned the form on, so the setup guide's
// checkboxes below let them finish both right here instead of hunting for
// onboarding or Form Setup again.
export default function Home() {
  const shopify = useAppBridge();
  const shop = useShop();
  const patchShop = usePatchShop();
  const [stats, setStats] = useState(null);
  const [formSettings, setFormSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    Promise.all([getDashboardStats(), getFormSettings()])
      .then(([statsResponse, formSettingsResponse]) => {
        setStats(statsResponse.stats);
        setFormSettings(formSettingsResponse.formSettings);
      })
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);

  function notify(message) {
    shopify.toast.show(message);
  }

  async function handleDpaToggle(accepted) {
    const previous = shop.dpaAccepted;
    patchShop({ dpaAccepted: accepted });
    try {
      await updateDpaAccepted(accepted);
    } catch (error) {
      patchShop({ dpaAccepted: previous });
      notify(error.message);
    }
  }

  async function handleFormEnabledToggle(enabled) {
    const previous = formSettings;
    const next = { ...formSettings, masterEnabled: enabled };
    setFormSettings(next);
    try {
      const { formSettings: saved } = await saveFormSettings(next);
      setFormSettings(saved);
    } catch (error) {
      setFormSettings(previous);
      notify(error.message);
    }
  }

  // Shared by both placement checkboxes below — same optimistic-update-then-
  // save shape as handleFormEnabledToggle, just targeting a different field.
  async function handlePlacementToggle(field, value) {
    const previous = formSettings;
    const next = { ...formSettings, [field]: value };
    setFormSettings(next);
    try {
      const { formSettings: saved } = await saveFormSettings(next);
      setFormSettings(saved);
    } catch (error) {
      setFormSettings(previous);
      notify(error.message);
    }
  }

  const handleToggleOrderStatus = (checked) => handlePlacementToggle("showOnOrderStatus", checked);
  const handleToggleStandalone = (checked) => handlePlacementToggle("showOnStandalonePage", checked);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (loadError) {
    return (
      <s-page heading="Home">
        <s-banner tone="critical" heading="Couldn't load dashboard stats">
          <s-paragraph>{loadError}</s-paragraph>
        </s-banner>
      </s-page>
    );
  }

  const setupSteps = buildSetupSteps({
    dpaAccepted: shop.dpaAccepted,
    formEnabled: formSettings.masterEnabled,
    showOnOrderStatus: formSettings.showOnOrderStatus,
    showOnStandalonePage: formSettings.showOnStandalonePage,
    orderStatusBlockAdded: shop.orderStatusBlockAdded,
    themeBlockAdded: shop.themeBlockAdded,
    onDpaToggle: handleDpaToggle,
    onFormToggle: handleFormEnabledToggle,
    onToggleOrderStatus: handleToggleOrderStatus,
    onToggleStandalone: handleToggleStandalone,
  });
  const completedCount = setupSteps.filter((step) => step.complete).length;

  return (
    <Dashboard
      shopDomain={shop.shop}
      stats={stats}
      setupSteps={setupSteps}
      completedCount={completedCount}
      showSetupGuide
    />
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
