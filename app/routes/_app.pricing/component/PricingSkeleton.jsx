import SkeletonBox from "../../../components/skeleton/SkeletonBox";

function PlanCardSkeleton() {
  return (
    <s-section>
      <s-stack direction="block" gap="base">
        <SkeletonBox width="50%" height="18px" />
        <SkeletonBox width="70%" height="28px" />
        <s-stack direction="block" gap="small-200">
          <SkeletonBox width="90%" height="12px" />
          <SkeletonBox width="80%" height="12px" />
          <SkeletonBox width="60%" height="12px" />
        </s-stack>
        <SkeletonBox width="100%" height="36px" radius="base" />
      </s-stack>
    </s-section>
  );
}

export default function PricingSkeleton() {
  return (
    <s-page heading="Pricing">
      <s-grid gridTemplateColumns="1fr 1fr 1fr" gap="base">
        <PlanCardSkeleton />
        <PlanCardSkeleton />
        <PlanCardSkeleton />
      </s-grid>
    </s-page>
  );
}
