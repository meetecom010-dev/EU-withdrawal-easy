/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import SkeletonBox from "../../../components/skeleton/SkeletonBox";

// Mirrors the real form-setup layout 1:1 (see route.jsx): the same responsive
// 2fr/1fr query-container grid, the same six left-column cards in order, and the
// sticky live-preview card on the right — so the switch from skeleton to content
// doesn't shift anything.

// A checkbox/toggle row: the control box plus its label + details lines.
function CheckRow() {
  return (
    <s-stack direction="inline" gap="base" alignItems="start">
      <SkeletonBox width="18px" height="18px" radius="4px" />
      <s-stack direction="block" gap="small-500">
        <SkeletonBox width="210px" height="13px" />
        <SkeletonBox width="320px" height="11px" />
      </s-stack>
    </s-stack>
  );
}

// A radio choice row.
function ChoiceRow({ width = "160px" }) {
  return (
    <s-stack direction="inline" gap="base" alignItems="center">
      <SkeletonBox width="16px" height="16px" radius="8px" />
      <SkeletonBox width={width} height="13px" />
    </s-stack>
  );
}

// A labelled input.
function FieldSkeleton({ labelWidth = "35%", height = "36px" }) {
  return (
    <s-stack direction="block" gap="small-200">
      <SkeletonBox width={labelWidth} height="12px" />
      <SkeletonBox width="100%" height={height} radius="base" />
    </s-stack>
  );
}

// A short subheading + one line of helper text, used inside the form builder.
function SubheadingSkeleton() {
  return (
    <s-stack direction="block" gap="small-500">
      <SkeletonBox width="150px" height="14px" />
      <SkeletonBox width="70%" height="11px" />
    </s-stack>
  );
}

// A picker: search box above a row of chips (Languages, and Countries when
// "specific").
function ChipCloudSkeleton() {
  return (
    <s-stack direction="block" gap="small-200">
      <SkeletonBox width="100%" height="36px" radius="base" />
      <s-stack direction="inline" gap="small-200">
        <SkeletonBox width="80px" height="28px" radius="16px" />
        <SkeletonBox width="100px" height="28px" radius="16px" />
        <SkeletonBox width="70px" height="28px" radius="16px" />
        <SkeletonBox width="90px" height="28px" radius="16px" />
      </s-stack>
    </s-stack>
  );
}

export default function FormSetupSkeleton() {
  return (
    <s-page heading="Form setup">
      <s-query-container>
        <s-grid
          gridTemplateColumns="@container (inline-size > 700px) 2fr 1fr, 1fr"
          gap="base"
          alignItems="start"
        >
          {/* Left column — the six configuration cards */}
          <s-stack direction="block" gap="base">
            {/* Enable EU Withdrawal Form */}
            <s-section heading="Enable EU Withdrawal Form">
              <s-stack direction="block" gap="small-200">
                <SkeletonBox width="85%" height="12px" />
                <CheckRow />
              </s-stack>
            </s-section>

            {/* Eligible countries */}
            <s-section heading="Eligible countries">
              <s-stack direction="block" gap="base">
                <SkeletonBox width="70%" height="12px" />
                <ChoiceRow width="150px" />
                <ChoiceRow width="200px" />
              </s-stack>
            </s-section>

            {/* Form builder */}
            <s-section>
              <s-stack direction="block" gap="base">
                <s-stack
                  direction="inline"
                  gap="base"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <SkeletonBox width="120px" height="18px" />
                  <s-stack direction="inline" gap="small-200">
                    <SkeletonBox width="90px" height="28px" radius="base" />
                    <SkeletonBox width="90px" height="28px" radius="base" />
                    <SkeletonBox width="70px" height="28px" radius="base" />
                  </s-stack>
                </s-stack>
                <SkeletonBox width="100%" height="44px" radius="base" />
                <SubheadingSkeleton />
                <FieldSkeleton />
                <FieldSkeleton height="56px" />
                <FieldSkeleton />
                <s-divider></s-divider>
                <SubheadingSkeleton />
                <FieldSkeleton />
                <FieldSkeleton height="56px" />
                <FieldSkeleton />
              </s-stack>
            </s-section>

            {/* Languages */}
            <s-section heading="Languages">
              <ChipCloudSkeleton />
            </s-section>

            {/* Automation */}
            <s-section heading="Automation">
              <s-stack direction="block" gap="base">
                <SkeletonBox width="160px" height="14px" />
                <CheckRow />
                <CheckRow />
                <s-divider></s-divider>
                <SkeletonBox width="120px" height="14px" />
                <ChoiceRow width="190px" />
                <ChoiceRow width="210px" />
              </s-stack>
            </s-section>

            {/* Withdrawal deadline */}
            <s-section heading="Withdrawal deadline">
              <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                <FieldSkeleton />
                <FieldSkeleton />
              </s-grid>
            </s-section>
          </s-stack>

          {/* Right column — sticky live preview */}
          <div style={{ position: "sticky", top: "16px", alignSelf: "start" }}>
            <s-section>
              <s-stack direction="block" gap="base">
                <s-stack
                  direction="inline"
                  gap="base"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <SkeletonBox width="100px" height="16px" />
                  <SkeletonBox width="140px" height="20px" radius="10px" />
                </s-stack>

                <s-box border="base" borderRadius="base" padding="base">
                  <s-stack direction="block" gap="small-200">
                    <SkeletonBox width="70%" height="18px" />
                    <SkeletonBox width="100%" height="12px" />
                    <SkeletonBox width="80%" height="12px" />
                    <SkeletonBox width="180px" height="32px" radius="base" />
                  </s-stack>
                </s-box>

                <SkeletonBox width="100%" height="52px" radius="base" />

                <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
                  <SkeletonBox width="110px" height="28px" radius="base" />
                  <SkeletonBox width="70px" height="12px" />
                </s-stack>
              </s-stack>
            </s-section>
          </div>
        </s-grid>
      </s-query-container>
    </s-page>
  );
}
