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
// complete them in: accept the DPA, turn the form on, then place the block.
// dpa/form are directly actionable from a checkbox right in the guide (see
// onToggle); the extension step isn't — whether the block is actually
// placed in the checkout & accounts editor can only be observed live via
// OrderStatusExtensionSync, not set by checking a box.
function buildSetupSteps({
  dpaAccepted,
  formEnabled,
  orderStatusBlockAdded,
  onDpaToggle,
  onFormToggle,
}) {
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
        "Turns the form on. Sensible defaults are already filled in — customize the fields, reasons and wording anytime from Form Setup.",
      complete: Boolean(formEnabled),
      checkboxLabel: "Enable the withdrawal form",
      onToggle: onFormToggle,
      ctaLabel: "Go to Form Setup",
      ctaHref: "/form-setup",
    },
    {
      key: "extension",
      label: "Add the withdrawal button to your storefront",
      description: "Add the extension block from the checkout & accounts editor.",
      complete: Boolean(orderStatusBlockAdded),
    },
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
    // Turning it on also puts it on the order status page — that's the only
    // surface there is, so a bare "enable" that doesn't also place it
    // anywhere wouldn't actually make the form live for customers.
    const next = {
      ...formSettings,
      masterEnabled: enabled,
      showOnOrderStatus: enabled ? true : formSettings.showOnOrderStatus,
    };
    setFormSettings(next);
    try {
      const { formSettings: saved } = await saveFormSettings(next);
      setFormSettings(saved);
    } catch (error) {
      setFormSettings(previous);
      notify(error.message);
    }
  }

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
    orderStatusBlockAdded: shop.orderStatusBlockAdded,
    onDpaToggle: handleDpaToggle,
    onFormToggle: handleFormEnabledToggle,
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
