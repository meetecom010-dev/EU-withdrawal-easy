/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import SkeletonBox from "../../../components/skeleton/SkeletonBox";

function ToggleRowSkeleton() {
  return (
    <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
      <s-stack direction="block" gap="small-200">
        <SkeletonBox width="220px" height="14px" />
        <SkeletonBox width="320px" height="12px" />
      </s-stack>
      <SkeletonBox width="36px" height="20px" radius="10px" />
    </s-stack>
  );
}

function FieldSkeleton({ labelWidth = "35%", height = "36px" }) {
  return (
    <s-stack direction="block" gap="small-200">
      <SkeletonBox width={labelWidth} height="12px" />
      <SkeletonBox width="100%" height={height} radius="base" />
    </s-stack>
  );
}

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
      <s-stack gap="large-100">
        <SkeletonBox width="70%" height="14px" />

        <s-grid gridTemplateColumns="2fr 1fr" gap="base">
          <s-stack direction="block" gap="large-100">
            <s-section>
              <s-stack direction="block" gap="base">
                <ToggleRowSkeleton />
                <s-divider></s-divider>
                <ToggleRowSkeleton />
              </s-stack>
            </s-section>

            <s-section heading="Countries">
              <ChipCloudSkeleton />
            </s-section>

            <s-section>
              <s-stack direction="block" gap="base">
                <SkeletonBox width="140px" height="18px" />
                <FieldSkeleton />
                <FieldSkeleton height="64px" />
                <FieldSkeleton />
                <s-divider></s-divider>
                <FieldSkeleton />
                <FieldSkeleton height="64px" />
                <FieldSkeleton />
              </s-stack>
            </s-section>

            <s-section heading="Languages">
              <ChipCloudSkeleton />
            </s-section>

            <s-section>
              <s-stack direction="block" gap="base">
                <SkeletonBox width="160px" height="18px" />
                <ToggleRowSkeleton />
                <FieldSkeleton labelWidth="20%" />
                <ToggleRowSkeleton />
                <s-grid gridTemplateColumns="1fr 1fr" gap="large-100">
                  <FieldSkeleton />
                  <FieldSkeleton />
                </s-grid>
              </s-stack>
            </s-section>
          </s-stack>

          <s-section heading="Live preview">
            <s-stack direction="block" gap="base">
              <SkeletonBox width="100%" height="18px" />
              <SkeletonBox width="100%" height="420px" radius="base" />
            </s-stack>
          </s-section>
        </s-grid>
      </s-stack>
    </s-page>
  );
}
