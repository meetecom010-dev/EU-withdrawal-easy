/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */

// TODO: swap HELP_CENTER_URL for the app's real destination once it exists.
const HELP_CENTER_URL = "https://example.com/help";
const SUPPORT_EMAIL = "support@withdrawaleasy.com";
const FAQ_URL = "/faqs";
const FEATURE_REQUEST_URL = "/feature-request";

function HelpCard({ title, description, linkLabel, href, external }) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small-200">
        <s-heading>{title}</s-heading>
        <s-text color="subdued">{description}</s-text>
        <s-link href={href} target={external ? "_blank" : undefined}>
          {linkLabel}
        </s-link>
      </s-stack>
    </s-box>
  );
}

export default function HelpResourcesCard() {
  return (
    <s-section heading="Help & resources">
      <s-grid gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))" gap="base">
        {/* <HelpCard
          title="Help center"
          description="Step-by-step guides for setup, daily use, and troubleshooting."
          linkLabel="Open help center"
          href={HELP_CENTER_URL}
          external
        /> */}
        <HelpCard
          title="Email support"
          description="Questions? Our support team is here to help."
          linkLabel="Contact support"
          href={`mailto:${SUPPORT_EMAIL}`}
        />
        <HelpCard
          title="FAQs"
          description="Answers to common questions about setting up and using the app."
          linkLabel="Open FAQ"
          href={FAQ_URL}
        />
        <HelpCard
          title="Feature request"
          description="Have an idea for the app? Let us know what you'd like to see."
          linkLabel="Request a feature"
          href={FEATURE_REQUEST_URL}
        />
      </s-grid>
    </s-section>
  );
}
