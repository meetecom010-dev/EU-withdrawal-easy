import { Outlet, useLoaderData, useNavigation, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { getOrCreateShop, serializeShop } from "../services/shop.server";
import { ShopProvider } from "../context/ShopContext";
import Onboarding from "./_app.home/component/onboarding/onboarding";
import DashboardSkeleton from "./_app.home/component/dashboard/DashboardSkeleton";
import FormSetupSkeleton from "./_app.form-setup/component/FormSetupSkeleton";
import RequestsTableSkeleton from "./_app.withdrawal-requests/component/RequestsTableSkeleton";
import RequestDetailSkeleton from "./_app.withdrawal-requests_.$id/component/RequestDetailSkeleton";
import PricingSkeleton from "./_app.pricing/component/PricingSkeleton";

// Picks the skeleton that matches the tab being navigated to, so the switch
// between tabs shows a shape close to the real page instead of the previous
// page staying frozen while the next route's loader runs.
function routeSkeletonFor(pathname) {
  if (!pathname) return null;
  if (pathname.startsWith("/form-setup")) return <FormSetupSkeleton />;
  if (/^\/withdrawal-requests\/.+/.test(pathname)) return <RequestDetailSkeleton />;
  if (pathname.startsWith("/withdrawal-requests")) return <RequestsTableSkeleton />;
  if (pathname.startsWith("/pricing")) return <PricingSkeleton />;
  if (pathname.startsWith("/home")) return <DashboardSkeleton />;
  return null;
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDoc = await getOrCreateShop(session.shop);

  return {
    // eslint-disable-next-line no-undef
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop: serializeShop(shopDoc),
  };
};

export default function App() {
  const { apiKey, shop } = useLoaderData();
  const navigation = useNavigation();
  const pendingSkeleton =
    navigation.state === "loading" && navigation.location
      ? routeSkeletonFor(navigation.location.pathname)
      : null;

  return (
    <AppProvider embedded apiKey={apiKey}>
      {shop.onboardingCompleted && (
        <s-app-nav>
          <s-link href="/form-setup">Form Setup</s-link>
          <s-link href="/withdrawal-requests">Withdrawal Requests</s-link>
          <s-link href="/pricing">Pricing</s-link>
        </s-app-nav>
      )}
      <ShopProvider shop={shop}>
        {shop.onboardingCompleted ? (pendingSkeleton ?? <Outlet />) : <Onboarding />}
      </ShopProvider>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
