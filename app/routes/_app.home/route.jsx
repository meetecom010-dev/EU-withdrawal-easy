import { useState } from "react";
import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import Onboarding from "./component/onboarding/onboarding";
import Dashboard from "./component/dashboard/dashboard";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

// Dummy data until real setup/withdrawal-request tracking exists.
const DUMMY_STATS = {
  openRequests: 4,
  approvedLast30: 12,
  withdrawalRate: 2.3,
  revenueAtRisk: 348.5,
};

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

export default function Home() {
  const [onboarded, setOnboarded] = useState(true);
  const completedCount = DUMMY_SETUP_STEPS.filter((step) => step.complete).length;

  if (!onboarded) {
    return <Onboarding onComplete={() => setOnboarded(true)} />;
  }

  return (
    <Dashboard
      shopDomain="example-store.myshopify.com"
      stats={DUMMY_STATS}
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
