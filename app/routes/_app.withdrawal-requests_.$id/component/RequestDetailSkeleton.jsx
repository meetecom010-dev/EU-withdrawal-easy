/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import SkeletonBox from "../../../components/skeleton/SkeletonBox";

// Mirrors the real RequestDetail layout (see RequestDetail.jsx): left column
// is Actions / Selected products / Refund / Activity history, right column is
// Deadline / Customer / Order / Automation status / Email history / Order
// tags / Reason given — kept in sync so the skeleton doesn't shift into a
// different layout when the content loads.

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

function RowSkeleton({ width = "50%" }) {
  return (
    <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="base">
      <SkeletonBox width="35%" height="12px" />
      <SkeletonBox width={width} height="12px" />
    </s-stack>
  );
}

function SideCardSkeleton({ headingWidth = "100px", rows = 3 }) {
  return (
    <s-section>
      <s-stack direction="block" gap="small-200">
        <SkeletonBox width={headingWidth} height="18px" />
        {Array.from({ length: rows }).map((_, index) => (
          <RowSkeleton key={index} width={`${60 - index * 10}%`} />
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
            <s-section>
              <s-stack direction="block" gap="small-200">
                <SkeletonBox width="80px" height="18px" />
                <s-stack direction="inline" gap="small-200">
                  <SkeletonBox width="110px" height="32px" radius="base" />
                  <SkeletonBox width="90px" height="32px" radius="base" />
                </s-stack>
              </s-stack>
            </s-section>

            <s-section>
              <s-stack direction="block" gap="base">
                <SkeletonBox width="150px" height="18px" />
                <ItemRowSkeleton />
                <ItemRowSkeleton />
                <s-divider></s-divider>
                <SkeletonBox width="30%" height="14px" />
              </s-stack>
            </s-section>

            <s-section>
              <s-stack direction="block" gap="small-200">
                <SkeletonBox width="80px" height="18px" />
                <RowSkeleton width="40%" />
                <RowSkeleton width="30%" />
                <RowSkeleton width="30%" />
              </s-stack>
            </s-section>

            <s-section>
              <s-stack direction="block" gap="base">
                <SkeletonBox width="120px" height="18px" />
                <SkeletonBox width="100%" height="36px" radius="base" />
                <TimelineRowSkeleton />
                <TimelineRowSkeleton />
                <TimelineRowSkeleton />
              </s-stack>
            </s-section>
          </s-stack>

          <s-stack direction="block" gap="large-100">
            <SideCardSkeleton headingWidth="80px" rows={2} />
            <SideCardSkeleton headingWidth="90px" rows={3} />
            <SideCardSkeleton headingWidth="70px" rows={3} />
            <SideCardSkeleton headingWidth="140px" rows={2} />
            <SideCardSkeleton headingWidth="110px" rows={2} />
            <SideCardSkeleton headingWidth="90px" rows={1} />
            <SideCardSkeleton headingWidth="110px" rows={1} />
          </s-stack>
        </s-grid>
      </s-stack>
    </s-page>
  );
}
