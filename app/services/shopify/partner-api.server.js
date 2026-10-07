// Shopify recommends the Partner API as the source for Shopify App Pricing
// subscriptions: unlike the Admin API it also has the plan handle, scheduled
// plan changes, and cancel-at-end-of-cycle. services/subscription.server.js
// uses it whenever these env vars are set, and the Admin API otherwise.
//
// Needs three env vars from the Partner Dashboard:
//   SHOPIFY_PARTNER_ORG_ID            the number in the Partner Dashboard URL
//   SHOPIFY_PARTNER_API_ACCESS_TOKEN  a Partner API client with "Manage apps"
//   SHOPIFY_APP_GID                   gid://shopify/App/<id from the app's URL>

const PARTNER_API_VERSION = "2026-07";

const ACTIVE_SUBSCRIPTION_QUERY = `#graphql
  query ActiveSubscription($appId: ID!, $shopId: ID!) {
    activeSubscription(appId: $appId, shopId: $shopId) {
      billingPeriod
      cancelAtEndOfCycle
      trialEndsAt
      legacySubscriptionId
      currentBillingCycle {
        startTime
        endTime
      }
      items {
        handle
        description
        price {
          __typename
          active
          currency
          ... on FlatRatePrice {
            amount
          }
        }
      }
      pendingUpdate {
        billingPeriod
        items {
          handle
        }
      }
    }
  }
`;

export class PartnerApiError extends Error {
  constructor(message, { status, graphqlErrors = [] } = {}) {
    super(message);
    this.name = "PartnerApiError";
    this.status = status;
    this.graphqlErrors = graphqlErrors;
  }
}

export function isPartnerApiConfigured() {
  return Boolean(
    process.env.SHOPIFY_PARTNER_ORG_ID &&
      process.env.SHOPIFY_PARTNER_API_ACCESS_TOKEN &&
      process.env.SHOPIFY_APP_GID,
  );
}

// Resolves to the shop's live subscription, or null when it has none (never
// picked a plan, or the plan ended). Throttling (4 requests per second per
// client) and every other failure throw instead, so a failed check is never
// mistaken for "no subscription".
export async function fetchActiveSubscription(shopGid) {
  const url = `https://partners.shopify.com/${process.env.SHOPIFY_PARTNER_ORG_ID}/api/${PARTNER_API_VERSION}/graphql.json`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": process.env.SHOPIFY_PARTNER_API_ACCESS_TOKEN,
    },
    body: JSON.stringify({
      query: ACTIVE_SUBSCRIPTION_QUERY,
      variables: { appId: process.env.SHOPIFY_APP_GID, shopId: shopGid },
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body || body.errors?.length) {
    const errors = body?.errors ?? [];
    throw new PartnerApiError(
      `ActiveSubscription failed (HTTP ${response.status}): ${
        errors.map((error) => error.message).join("; ") || "no response body"
      }`,
      { status: response.status, graphqlErrors: errors },
    );
  }

  return body.data?.activeSubscription ?? null;
}
