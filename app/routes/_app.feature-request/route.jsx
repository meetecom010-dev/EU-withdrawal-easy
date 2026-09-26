import { useState } from "react";
import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";
import { submitFeatureRequest } from "../../utils/api/featureRequests";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

const EMPTY_FORM = { firstName: "", lastName: "", email: "", request: "" };

// Reachable from the "Feature request" card in Help & resources on Home.
export default function FeatureRequest() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const canSubmit =
    form.firstName.trim() && form.lastName.trim() && form.email.trim() && form.request.trim();

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitFeatureRequest(form);
      setSubmitted(true);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <s-page heading="Request a feature">
      <s-button slot="breadcrumb-actions" href="/" accessibilityLabel="Back to dashboard" />

      <s-section>
        <s-stack direction="block" gap="base">
          {submitted && (
            <s-banner tone="success" dismissible onDismiss={() => setSubmitted(false)}>
              <s-paragraph>
                Thanks! Your feature request has been sent to our team.
              </s-paragraph>
            </s-banner>
          )}

          {error && (
            <s-banner tone="critical" dismissible onDismiss={() => setError(null)}>
              <s-paragraph>{error}</s-paragraph>
            </s-banner>
          )}

          <s-paragraph color="subdued">
            Tell us what you&apos;d like to see in the app — we read every submission.
          </s-paragraph>

          <s-grid gridTemplateColumns="1fr 1fr" gap="base">
            <s-text-field
              label="First name"
              value={form.firstName}
              onInput={(e) => update("firstName", e.currentTarget.value)}
              required
            ></s-text-field>
            <s-text-field
              label="Last name"
              value={form.lastName}
              onInput={(e) => update("lastName", e.currentTarget.value)}
              required
            ></s-text-field>
          </s-grid>

          <s-email-field
            label="Email"
            value={form.email}
            onInput={(e) => update("email", e.currentTarget.value)}
            required
          ></s-email-field>

          <s-text-area
            label="What feature would you like to see?"
            placeholder="Describe the feature you're looking for…"
            value={form.request}
            onInput={(e) => update("request", e.currentTarget.value)}
            rows={5}
            required
          ></s-text-area>

          <s-stack direction="inline">
            <s-button
              variant="primary"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting || undefined}
              loading={isSubmitting || undefined}
            >
              Submit request
            </s-button>
          </s-stack>
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
