/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import SkeletonBox from "../../../components/skeleton/SkeletonBox";

// Mirrors the real page's first render: the search field, then topic cards of
// collapsed rows (every answer shut until the merchant opens one).
function FaqGroupSkeleton({ rows }) {
  return (
    <s-section>
      <s-stack direction="block" gap="base">
        <SkeletonBox width="160px" height="14px" />
        <s-stack direction="block" gap="small-200">
          {Array.from({ length: rows }, (_, index) => (
            <s-box key={index} paddingBlock="small-200" paddingInline="base">
              <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
                <SkeletonBox width="60%" height="14px" />
                <SkeletonBox width="16px" height="16px" />
              </s-grid>
            </s-box>
          ))}
        </s-stack>
      </s-stack>
    </s-section>
  );
}

export default function FaqsSkeleton() {
  const { t } = useTranslation();
  return (
    <s-page heading={t("faqs.pageTitle")}>
      <s-section>
        <SkeletonBox width="100%" height="32px" radius="8px" />
      </s-section>
      <FaqGroupSkeleton rows={3} />
      <FaqGroupSkeleton rows={3} />
    </s-page>
  );
}
