/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import SkeletonBox from "../../../../components/skeleton/SkeletonBox";

function StatTileSkeleton() {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small-200">
        <SkeletonBox width="70%" height="12px" />
        <SkeletonBox width="45%" height="24px" />
      </s-stack>
    </s-box>
  );
}

function ChecklistRowSkeleton({ withDivider }) {
  return (
    <s-stack direction="block" gap="small-200">
      {withDivider && <s-divider></s-divider>}
      <s-box padding="small">
        <s-stack direction="block" gap="small-200">
          <SkeletonBox width="55%" height="14px" />
          <SkeletonBox width="85%" height="12px" />
        </s-stack>
      </s-box>
    </s-stack>
  );
}

export default function DashboardSkeleton() {
  return (
    <s-page heading="Home">
      <s-stack direction="block" gap="large-100">
        <SkeletonBox width="60%" height="14px" />

        <s-section>
          <s-stack direction="block" gap="base">
            <SkeletonBox width="90px" height="18px" />
            <s-grid gridTemplateColumns="1fr 1fr 1fr 1fr" gap="base">
              <StatTileSkeleton />
              <StatTileSkeleton />
              <StatTileSkeleton />
              <StatTileSkeleton />
            </s-grid>
          </s-stack>
        </s-section>

        <s-grid gridTemplateColumns="2fr 1fr" gap="base">
          <s-section>
            <s-stack direction="block" gap="base">
              <SkeletonBox width="110px" height="18px" />
              <SkeletonBox width="30%" height="12px" />
              <SkeletonBox width="100%" height="6px" radius="base" />
              <s-box border="base" borderRadius="base">
                <ChecklistRowSkeleton />
                <ChecklistRowSkeleton withDivider />
                <ChecklistRowSkeleton withDivider />
              </s-box>
            </s-stack>
          </s-section>

          <s-section>
            <s-stack direction="block" gap="small-200">
              <SkeletonBox width="90px" height="18px" />
              <SkeletonBox width="90%" height="12px" />
              <SkeletonBox width="80%" height="12px" />
              <SkeletonBox width="70%" height="12px" />
            </s-stack>
          </s-section>
        </s-grid>
      </s-stack>
    </s-page>
  );
}
