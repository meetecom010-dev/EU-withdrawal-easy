import { useEffect, useState } from "react";
import { useRouteError } from "react-router";
import { useTranslation } from "react-i18next";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import { useShop } from "../../context/ShopContext";
import { getDashboardStats } from "../../utils/api/dashboardStats";
import { getFormSettings, saveFormSettings } from "../../utils/api/formSettings";
import Dashboard from "./component/dashboard/dashboard";
import DashboardSkeleton from "./component/dashboard/DashboardSkeleton";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

// Builds the setup-guide steps from real, live state instead of a hardcoded
// guess. Order matters here — it's the order a merchant should reasonably
// complete them in: turn the form on and pick where it shows, then add the
// block(s) for whichever surfaces were picked. The form toggle and the two
// placement checkboxes are directly actionable right in the guide (see
// onToggle); the "blocks" step isn't — whether a block is actually placed
// can only be observed live via *ExtensionSync, not set by checking a box,
// so those checkboxes are status indicators, not controls (see
// SetupGuideCard.jsx).
function buildSetupSteps(
  t,
  {
    formEnabled,
    showOnOrderStatus,
    showOnStandalonePage,
    orderStatusBlockAdded,
    themeBlockAdded,
    onFormToggle,
    onToggleOrderStatus,
    onToggleStandalone,
  },
) {
  // Only surfaces the merchant actually picked get a block-setup entry —
  // otherwise the final step would show an unavoidable, always-incomplete
  // task for a surface nobody asked for.
  const blockSurfaces = [
    ...(showOnOrderStatus
      ? [
          {
            key: "orderStatus",
            label: t("home.setupGuide.steps.blocks.surfaces.orderStatus"),
            liveMessage: t("home.setupGuide.steps.blocks.live.orderStatus"),
            added: Boolean(orderStatusBlockAdded),
          },
        ]
      : []),
    ...(showOnStandalonePage
      ? [
          {
            key: "theme",
            label: t("home.setupGuide.steps.blocks.surfaces.theme"),
            liveMessage: t("home.setupGuide.steps.blocks.live.theme"),
            added: Boolean(themeBlockAdded),
          },
        ]
      : []),
  ];

  return [
    {
      key: "form",
      label: t("home.setupGuide.steps.form.label"),
      description: t("home.setupGuide.steps.form.description"),
      complete: Boolean(formEnabled),
      checkboxLabel: t("home.setupGuide.steps.form.checkbox"),
      onToggle: onFormToggle,
      ctaLabel: t("home.setupGuide.steps.form.cta"),
      ctaHref: "/form-setup",
      // Where to show it — a merchant can pick one or both. The next step
      // (blockSurfaces above) only shows setup instructions for what's
      // picked here. Option labels/details are the shared `placements.*`
      // copy that onboarding/steps/WithdrawalStep.jsx uses too, so the two
      // flows read as the same feature.
      placementHeading: t("home.setupGuide.steps.form.placementHeading"),
      placementDescription: t("home.setupGuide.steps.form.placementDescription"),
      placementOptions: [
        {
          key: "orderStatus",
          label: t("placements.orderStatus.label"),
          details: t("placements.orderStatus.details"),
          checked: Boolean(showOnOrderStatus),
          onToggle: onToggleOrderStatus,
        },
        {
          key: "theme",
          label: t("placements.storefront.label"),
          details: t("placements.storefront.details"),
          checked: Boolean(showOnStandalonePage),
          onToggle: onToggleStandalone,
        },
      ],
    },
    {
      key: "blocks",
      label: t("home.setupGuide.steps.blocks.label"),
      description: t("home.setupGuide.steps.blocks.description"),
      // Stays in the guide even before step 2 is done, so a merchant sees
      // what's still ahead instead of the step just vanishing — it just has
      // nothing to check off (and says so) until a placement is picked.
      locked: !formEnabled || blockSurfaces.length === 0,
      complete: blockSurfaces.some((surface) => surface.added),
      surfaces: blockSurfaces,
    },
  ];
}

// This route only renders once routes/_app.jsx has confirmed onboarding is
// complete OR dismissed for the session — a merchant can land here without
// ever having turned the form on, so the setup guide's checkboxes below let
// them finish right here instead of hunting for onboarding or Settings again.
export default function Home() {
  const { t } = useTranslation();
  const shop = useShop();
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

  // Save failures show in a banner at the top of Home (not a toast, which
  // disappears before the merchant can act on it).
  const [actionError, setActionError] = useState(null);

  function notify(message) {
    setActionError(message);
  }

  async function handleFormEnabledToggle(enabled) {
    setActionError(null);
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
    setActionError(null);
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
      <s-page heading={t("home.pageTitle")}>
        <s-banner tone="critical" heading={t("home.loadError")}>
          <s-paragraph>{loadError}</s-paragraph>
        </s-banner>
      </s-page>
    );
  }

  const setupSteps = buildSetupSteps(t, {
    formEnabled: formSettings.masterEnabled,
    showOnOrderStatus: formSettings.showOnOrderStatus,
    showOnStandalonePage: formSettings.showOnStandalonePage,
    orderStatusBlockAdded: shop.orderStatusBlockAdded,
    themeBlockAdded: shop.themeBlockAdded,
    onFormToggle: handleFormEnabledToggle,
    onToggleOrderStatus: handleToggleOrderStatus,
    onToggleStandalone: handleToggleStandalone,
  });
  const completedCount = setupSteps.filter((step) => step.complete).length;

  return (
    <Dashboard
      actionError={actionError}
      onDismissActionError={() => setActionError(null)}
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
