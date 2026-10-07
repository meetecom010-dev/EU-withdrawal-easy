import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import { adminQuery } from "../../services/shopify/client.server";

// Shopify App Pricing hosts the plan selection page in the admin, outside the
// app's iframe, at /charges/<app handle>/pricing_plans. The handle is fixed
// for an app, so one lookup per server process is enough.
const APP_HANDLE_QUERY = `#graphql
  query AppHandle {
    currentAppInstallation {
      app {
        handle
      }
    }
  }
`;

let appHandle = null;

export const loader = async ({ request }) => {
  const { admin, redirect } = await authenticate.admin(request);
  if (!appHandle) {
    const data = await adminQuery(admin, { operation: "AppHandle", query: APP_HANDLE_QUERY });
    appHandle = data.currentAppInstallation.app.handle;
  }
  return redirect(`shopify://admin/charges/${appHandle}/pricing_plans`, { target: "_top" });
};

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
