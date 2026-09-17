import { useEffect, useState } from "react";
import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import { useShop } from "../../context/ShopContext";
import { getDashboardStats } from "../../utils/api/dashboardStats";
import Dashboard from "./component/dashboard/dashboard";
import DashboardSkeleton from "./component/dashboard/DashboardSkeleton";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

// Dummy data until real setup-step tracking exists (stats themselves are
// fetched live from /api/dashboard-stats below).
const DUMMY_SETUP_STEPS = [
  {
    key: "dpa",
    label: "Accept the Data Processing Agreement",
    description: "Required before we can process withdrawal requests on your behalf.",
    complete: true,
  },
  {
    key: "extension",
    label: "Add the withdrawal button to your storefront",
    description: "Enable the theme app extension from your theme editor.",
    complete: false,
  },
  {
    key: "form",
    label: "Configure your withdrawal form",
    description: "Choose the fields and reasons customers can select.",
    complete: false,
  },
];

// This route only renders once routes/_app.jsx has confirmed onboarding is
// complete, so it always shows the dashboard.
export default function Home() {
  const shop = useShop();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const completedCount = DUMMY_SETUP_STEPS.filter((step) => step.complete).length;

  useEffect(() => {
    getDashboardStats()
      .then(({ stats }) => setStats(stats))
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <Dashboard
      shopDomain={shop.shop}
      stats={stats}
      setupSteps={DUMMY_SETUP_STEPS}
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
