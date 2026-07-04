/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
export default function AboutCard({ expanded }) {
  return (
    <s-section heading="Welcome">
      <s-stack direction="block" gap="base">
        <s-paragraph color="subdued">
          This app adds an EU withdrawal request form to your storefront and
          helps you manage every request in one place.
        </s-paragraph>
        {expanded && (
          <s-unordered-list>
            <s-list-item>Guest-friendly withdrawal form</s-list-item>
            <s-list-item>Automatic confirmation emails</s-list-item>
            <s-list-item>Centralized request tracking</s-list-item>
          </s-unordered-list>
        )}
      </s-stack>
    </s-section>
  );
}
