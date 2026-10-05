/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { Outlet, useLoaderData, useNavigation, useRouteError } from "react-router";
import { useTranslation } from "react-i18next";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { getOrCreateShop, serializeShop } from "../services/shop.server";
import { getOrCreateAppSettings, serializeFormSettings } from "../services/app-settings.server";
import { ShopProvider, useShop, useOnboardingDismissed } from "../context/ShopContext";
import OrderStatusExtensionSync from "../components/OrderStatusExtensionSync";
import ThemeBlockExtensionSync from "../components/ThemeBlockExtensionSync";
import Onboarding from "./_app._index/component/onboarding/onboarding";
import DashboardSkeleton from "./_app._index/component/dashboard/DashboardSkeleton";
import FormSetupSkeleton from "./_app.form-setup/component/FormSetupSkeleton";
import RequestsTableSkeleton from "./_app.withdrawal-requests/component/RequestsTableSkeleton";
import RequestDetailSkeleton from "./_app.withdrawal-requests_.$id/component/RequestDetailSkeleton";
import EmailTemplatesSkeleton from "./_app.email-templates/component/EmailTemplatesSkeleton";
import FaqsSkeleton from "./_app.faqs/component/FaqsSkeleton";

// Picks the skeleton that matches the tab being navigated to, so the switch
// between tabs shows a shape close to the real page instead of the previous
// page staying frozen while the next route's loader runs.
function routeSkeletonFor(pathname) {
  if (!pathname) return null;
  if (pathname.startsWith("/form-setup")) return <FormSetupSkeleton />;
  if (/^\/withdrawal-requests\/.+/.test(pathname)) return <RequestDetailSkeleton />;
  if (pathname.startsWith("/withdrawal-requests")) return <RequestsTableSkeleton />;
  if (pathname.startsWith("/email-templates")) return <EmailTemplatesSkeleton />;
  if (pathname.startsWith("/faqs")) return <FaqsSkeleton />;
  if (pathname === "/") return <DashboardSkeleton />;
  return null;
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDoc = await getOrCreateShop(session.shop);

  // Onboarding (rendered below) is the only consumer of formSettings here —
  // skip the extra query once a shop has it behind them, so every other page
  // load isn't paying for a fetch it never uses.
  const onboardingFormSettings = shopDoc.onboardingCompleted
    ? null
    : serializeFormSettings(await getOrCreateAppSettings(session.shop));

  return {
    // eslint-disable-next-line no-undef
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop: serializeShop(shopDoc),
    onboardingFormSettings,
  };
};

// Rendered inside ShopProvider so it can read onboardingDismissed. Onboarding
// shows only once, after install: finishing or skipping saves
// onboardingCompleted, and onboardingDismissed opens the app straight away
// while that save is in flight.
function AppShell({ pendingSkeleton, onboardingFormSettings }) {
  const { t } = useTranslation();
  const shop = useShop();
  const onboardingDismissed = useOnboardingDismissed();
  const showApp = shop.onboardingCompleted || onboardingDismissed;

  return (
    <>
      {showApp && (
        <s-app-nav>
          <s-link href="/" rel="home">
            {t("nav.home")}
          </s-link>
          {/* Most-used page first. Labels match each page's title. */}
          <s-link href="/form-setup">{t("nav.formSetup")}</s-link>
          <s-link href="/withdrawal-requests">{t("nav.withdrawalRequests")}</s-link>
          <s-link href="/email-templates">{t("nav.emailTemplates")}</s-link>
        </s-app-nav>
      )}
      <OrderStatusExtensionSync />
      <ThemeBlockExtensionSync />
      {showApp ? (
        pendingSkeleton ?? <Outlet />
      ) : (
        <Onboarding initialFormSettings={onboardingFormSettings} />
      )}
    </>
  );
}

export default function App() {
  const { apiKey, shop, onboardingFormSettings } = useLoaderData();
  const navigation = useNavigation();
  const pendingSkeleton =
    navigation.state === "loading" && navigation.location
      ? routeSkeletonFor(navigation.location.pathname)
      : null;

  return (
    <AppProvider embedded apiKey={apiKey}>
      <ShopProvider shop={shop}>
        <AppShell pendingSkeleton={pendingSkeleton} onboardingFormSettings={onboardingFormSettings} />
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
