/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
export default function PlanCard({ name, price, features, isCurrent, onSelect, isSelecting }) {
  return (
    <s-section heading={name}>
      <s-stack direction="block" gap="base">
        <s-heading>{price}</s-heading>
        <s-unordered-list>
          {features.map((feature) => (
            <s-list-item key={feature}>{feature}</s-list-item>
          ))}
        </s-unordered-list>
        {isCurrent ? (
          <s-badge tone="success">Current plan</s-badge>
        ) : (
          <s-button
            variant="primary"
            onClick={onSelect}
            {...(isSelecting ? { loading: true } : {})}
          >
            Choose plan
          </s-button>
        )}
      </s-stack>
    </s-section>
  );
}
