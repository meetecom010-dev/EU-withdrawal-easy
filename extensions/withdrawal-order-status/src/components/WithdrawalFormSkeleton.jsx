// Placeholder for the compact entry card (heading + description + start
// button) while the form's settings/eligibility are still being fetched.
// Sized to roughly match that card so there's no layout jump once the real
// content swaps in.
export default function WithdrawalFormSkeleton() {
  return (
    <s-section>
      <s-stack direction="block" gap="base">
        <s-skeleton-paragraph content="Change your mind about this order?"></s-skeleton-paragraph>
        <s-skeleton-paragraph content="You can request to withdraw part or all of this order within the return window."></s-skeleton-paragraph>
        <s-stack direction="inline">
          <s-skeleton-paragraph content="Start withdrawal request"></s-skeleton-paragraph>
        </s-stack>
      </s-stack>
    </s-section>
  );
}
