/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import SkeletonBox from "../../../components/skeleton/SkeletonBox";

function ItemRowSkeleton() {
  return (
    <s-stack direction="inline" gap="base" alignItems="center">
      <SkeletonBox width="40px" height="40px" radius="base" />
      <s-stack direction="block" gap="small-100" style={{ flex: 1 }}>
        <SkeletonBox width="60%" height="13px" />
        <SkeletonBox width="30%" height="12px" />
      </s-stack>
      <SkeletonBox width="50px" height="13px" />
    </s-stack>
  );
}

function TimelineRowSkeleton() {
  return (
    <s-stack direction="inline" gap="small-200" alignItems="center">
      <SkeletonBox width="20px" height="20px" radius="10px" />
      <SkeletonBox width="70%" height="12px" />
    </s-stack>
  );
}

function SideCardSkeleton({ lines = 3 }) {
  return (
    <s-section>
      <s-stack direction="block" gap="small-200">
        <SkeletonBox width="40%" height="16px" />
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonBox key={index} width={`${80 - index * 12}%`} height="12px" />
        ))}
      </s-stack>
    </s-section>
  );
}

export default function RequestDetailSkeleton() {
  return (
    <s-page heading="Withdrawal request">
      <s-stack direction="block" gap="large-100">
        <SkeletonBox width="50%" height="13px" />

        <s-grid gridTemplateColumns="2fr 1fr" gap="base">
          <s-stack direction="block" gap="large-100">
            <s-section heading="Items to withdraw">
              <s-stack direction="block" gap="base">
                <ItemRowSkeleton />
                <ItemRowSkeleton />
                <s-divider></s-divider>
                <SkeletonBox width="30%" height="14px" />
              </s-stack>
            </s-section>

            <s-section heading="Timeline">
              <s-stack direction="block" gap="base">
                <SkeletonBox width="100%" height="36px" radius="base" />
                <TimelineRowSkeleton />
                <TimelineRowSkeleton />
                <TimelineRowSkeleton />
              </s-stack>
            </s-section>
          </s-stack>

          <s-stack direction="block" gap="large-100">
            <SideCardSkeleton lines={2} />
            <SideCardSkeleton lines={3} />
            <SideCardSkeleton lines={2} />
            <SideCardSkeleton lines={2} />
          </s-stack>
        </s-grid>
      </s-stack>
    </s-page>
  );
}
