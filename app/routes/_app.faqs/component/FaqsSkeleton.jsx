import SkeletonBox from "../../../components/skeleton/SkeletonBox";

// Collapsed rows only — that's how the real page first renders, every answer
// shut until the merchant opens one.
function FaqRowSkeleton() {
  return (
    <s-box border="base" borderRadius="base" padding="base">
      <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
        <SkeletonBox width="60%" height="14px" />
        <SkeletonBox width="16px" height="16px" />
      </s-stack>
    </s-box>
  );
}

export default function FaqsSkeleton() {
  return (
    <s-page heading="FAQs">
      <s-section>
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
            <SkeletonBox width="240px" height="12px" />
            <SkeletonBox width="90px" height="28px" radius="8px" />
          </s-stack>
          {Array.from({ length: 6 }, (_, index) => (
            <FaqRowSkeleton key={index} />
          ))}
        </s-stack>
      </s-section>
    </s-page>
  );
}
