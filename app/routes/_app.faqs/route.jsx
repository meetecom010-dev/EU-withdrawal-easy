import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import { FAQS } from "./faqs";
import FaqAccordion from "./component/FaqAccordion";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

// Static content, so there's nothing to fetch and no skeleton state — the page
// is reachable from the FAQs card in Help & resources on Home.
export default function Faqs() {
  return (
    <s-page heading="FAQs">
      <s-section>
        <FaqAccordion faqs={FAQS} />
      </s-section>

      <s-section heading="Still stuck?">
        <s-stack direction="block" gap="small-200">
          <s-text color="subdued">
            If your question isn&apos;t here, send it over — we answer support email ourselves.
          </s-text>
          <s-link href="mailto:support@withdrawaleasy.com">Contact support</s-link>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
