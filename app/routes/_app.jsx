/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { Outlet, useLoaderData, useNavigation, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { getOrCreateShop, serializeShop } from "../services/shop.server";
import { ShopProvider, useShop, useOnboardingDismissed } from "../context/ShopContext";
import OrderStatusExtensionSync from "../components/OrderStatusExtensionSync";
import ThemeBlockExtensionSync from "../components/ThemeBlockExtensionSync";
import Onboarding from "./_app._index/component/onboarding/onboarding";
import DashboardSkeleton from "./_app._index/component/dashboard/DashboardSkeleton";
import FormSetupSkeleton from "./_app.form-setup/component/FormSetupSkeleton";
import RequestsTableSkeleton from "./_app.withdrawal-requests/component/RequestsTableSkeleton";
import RequestDetailSkeleton from "./_app.withdrawal-requests_.$id/component/RequestDetailSkeleton";
import PricingSkeleton from "./_app.pricing/component/PricingSkeleton";
import EmailTemplatesSkeleton from "./_app.email-templates/component/EmailTemplatesSkeleton";

// Picks the skeleton that matches the tab being navigated to, so the switch
// between tabs shows a shape close to the real page instead of the previous
// page staying frozen while the next route's loader runs.
function routeSkeletonFor(pathname) {
  if (!pathname) return null;
  if (pathname.startsWith("/form-setup")) return <FormSetupSkeleton />;
  if (/^\/withdrawal-requests\/.+/.test(pathname)) return <RequestDetailSkeleton />;
  if (pathname.startsWith("/withdrawal-requests")) return <RequestsTableSkeleton />;
  if (pathname.startsWith("/pricing")) return <PricingSkeleton />;
  if (pathname.startsWith("/email-templates")) return <EmailTemplatesSkeleton />;
  if (pathname === "/") return <DashboardSkeleton />;
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

// Rendered inside ShopProvider so it can read onboardingDismissed — a
// merchant who clicks "Skip for now" sees the real app for the rest of this
// session (nav included) even though onboardingCompleted is still false in
// the database, so onboarding comes back next time they open the app.
function AppShell({ pendingSkeleton }) {
  const shop = useShop();
  const onboardingDismissed = useOnboardingDismissed();
  const showApp = shop.onboardingCompleted || onboardingDismissed;

  return (
    <>
      {showApp && (
        <s-app-nav>
          <s-link href="/form-setup">Form Setup</s-link>
          <s-link href="/withdrawal-requests">Withdrawal Requests</s-link>
          <s-link href="/email-templates">Email Templates</s-link>
          {/* <s-link href="/pricing">Pricing</s-link> */}
        </s-app-nav>
      )}
      <OrderStatusExtensionSync />
      <ThemeBlockExtensionSync />
      {showApp ? (pendingSkeleton ?? <Outlet />) : <Onboarding />}
    </>
  );
}

export default function App() {
  const { apiKey, shop } = useLoaderData();
  const navigation = useNavigation();
  const pendingSkeleton =
    navigation.state === "loading" && navigation.location
      ? routeSkeletonFor(navigation.location.pathname)
      : null;

  return (
    <AppProvider embedded apiKey={apiKey}>
      <ShopProvider shop={shop}>
        <AppShell pendingSkeleton={pendingSkeleton} />
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
