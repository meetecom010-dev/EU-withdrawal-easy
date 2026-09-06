/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import SkeletonBox from "../../../../components/skeleton/SkeletonBox";

// Mirrors the real Home dashboard (see dashboard.jsx): the setup-incomplete
// banner, the four-tile "Withdrawal requests" stats, and the full-width setup
// guide with its three checklist rows — so the skeleton doesn't shift into a
// different layout when the content loads.

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

// One setup-guide row: status icon + label + collapse chevron, matching the
// real "auto 1fr auto" grid.
function ChecklistRowSkeleton({ withDivider }) {
  return (
    <s-box>
      {withDivider && <s-divider></s-divider>}
      <s-box padding="small">
        <s-grid gridTemplateColumns="auto 1fr auto" gap="small-300" alignItems="center">
          <SkeletonBox width="18px" height="18px" radius="9px" />
          <SkeletonBox width="55%" height="13px" />
          <SkeletonBox width="24px" height="24px" radius="base" />
        </s-grid>
      </s-box>
    </s-box>
  );
}

export default function DashboardSkeleton() {
  return (
    <s-page heading="Home">
      <s-stack direction="block" gap="large-100">
        {/* Setup-incomplete warning banner */}
        <SkeletonBox width="100%" height="56px" radius="base" />

        {/* Withdrawal requests — four stat tiles */}
        <s-section heading="Withdrawal requests">
          <s-grid gridTemplateColumns="1fr 1fr 1fr 1fr" gap="base">
            <StatTileSkeleton />
            <StatTileSkeleton />
            <StatTileSkeleton />
            <StatTileSkeleton />
          </s-grid>
        </s-section>

        {/* Set up guide — full width */}
        <s-section>
          <s-stack direction="block" gap="base">
            <s-grid gridTemplateColumns="1fr auto auto" gap="small-300" alignItems="center">
              <SkeletonBox width="130px" height="18px" />
              <SkeletonBox width="28px" height="28px" radius="base" />
              <SkeletonBox width="28px" height="28px" radius="base" />
            </s-grid>
            <SkeletonBox width="72%" height="12px" />
            <SkeletonBox width="150px" height="12px" />
            <s-box border="base" borderRadius="base">
              <ChecklistRowSkeleton />
              <ChecklistRowSkeleton withDivider />
              <ChecklistRowSkeleton withDivider />
            </s-box>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}
