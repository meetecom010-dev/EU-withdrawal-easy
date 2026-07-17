import { authenticate } from "../../shopify.server";

const PUBLISHED_CHECKOUT_PROFILE_QUERY = `#graphql
  query PublishedCheckoutProfile {
    checkoutProfiles(first: 10) {
      nodes {
        id
        isPublished
      }
    }
  }
`;

// GET /api/checkout-profile -> the shop's published checkout profile id,
// used to deep link merchants straight to the checkout & accounts editor.
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(PUBLISHED_CHECKOUT_PROFILE_QUERY);
  const { data } = await response.json();

  const published = data?.checkoutProfiles?.nodes?.find((profile) => profile.isPublished);
  const checkoutProfileId = published ? published.id.split("/").pop() : null;

  return Response.json({ checkoutProfileId });
};
