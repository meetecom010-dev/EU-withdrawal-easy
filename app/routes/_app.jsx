import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { getOrCreateShop, serializeShop } from "../services/shop.server";
import { ShopProvider } from "../context/ShopContext";
import Onboarding from "./_app.home/component/onboarding/onboarding";

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

  return (
    <AppProvider embedded apiKey={apiKey}>
      {shop.onboardingCompleted && (
        <s-app-nav>
          <s-link href="/home">Home</s-link>
          <s-link href="/form-setup">Form Setup</s-link>
          <s-link href="/withdrawal-requests">Withdrawal Requests</s-link>
          <s-link href="/pricing">Pricing</s-link>
        </s-app-nav>
      )}
      <ShopProvider shop={shop}>
        {shop.onboardingCompleted ? <Outlet /> : <Onboarding />}
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
