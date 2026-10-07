import { adminQuery } from "./client.server";

// Every Shopify App Pricing subscription also exists as an AppSubscription in
// the Admin API (the Partner API's legacySubscriptionId points at it). The
// numeric part of its ID is the charge_id Shopify appends to the redirect
// after a merchant picks a plan, so this is how a charge_id is checked without
// Partner API credentials. currentAppInstallation only returns this app's
// subscriptions on this shop, so an ID from another shop never matches.
const ACTIVE_APP_SUBSCRIPTIONS_QUERY = `#graphql
  query ActiveAppSubscriptions {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        test
        trialDays
        createdAt
        currentPeriodEnd
        lineItems {
          plan {
            pricingDetails {
              __typename
              ... on AppRecurringPricing {
                interval
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function fetchActiveAppSubscriptions(admin) {
  const data = await adminQuery(admin, {
    operation: "ActiveAppSubscriptions",
    query: ACTIVE_APP_SUBSCRIPTIONS_QUERY,
  });
  return data.currentAppInstallation?.activeSubscriptions ?? [];
}
