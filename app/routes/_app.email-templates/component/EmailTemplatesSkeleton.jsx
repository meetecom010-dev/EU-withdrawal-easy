/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import SkeletonBox from "../../../components/skeleton/SkeletonBox";

function FieldSkeleton({ labelWidth = "35%", height = "36px" }) {
  return (
    <s-stack direction="block" gap="small-200">
      <SkeletonBox width={labelWidth} height="12px" />
      <SkeletonBox width="100%" height={height} radius="base" />
    </s-stack>
  );
}

export default function EmailTemplatesSkeleton() {
  return (
    <s-page heading="Email templates">
      <s-stack direction="block" gap="base">
        <s-section>
          <s-stack direction="block" gap="base">
            <SkeletonBox width="130px" height="18px" />
            <s-grid gridTemplateColumns="1fr 1fr" gap="base">
              <FieldSkeleton />
              <FieldSkeleton />
            </s-grid>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack direction="block" gap="base">
            <SkeletonBox width="110px" height="18px" />
            <FieldSkeleton labelWidth="20%" />
            <FieldSkeleton labelWidth="45%" />
            <FieldSkeleton labelWidth="25%" />
            <s-stack direction="block" gap="small-200">
              <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
                <SkeletonBox width="120px" height="14px" />
                <SkeletonBox width="180px" height="28px" radius="base" />
              </s-stack>
              <SkeletonBox width="100%" height="560px" radius="base" />
            </s-stack>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}
