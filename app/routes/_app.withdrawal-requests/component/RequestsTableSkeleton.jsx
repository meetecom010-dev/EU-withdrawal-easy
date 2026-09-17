import SkeletonBox from "../../../components/skeleton/SkeletonBox";

function RowSkeleton() {
  return (
    <s-table-row>
      <s-table-cell>
        <SkeletonBox width="60px" height="14px" />
      </s-table-cell>
      <s-table-cell>
        <s-stack direction="block" gap="small-100">
          <SkeletonBox width="100px" height="13px" />
          <SkeletonBox width="140px" height="12px" />
        </s-stack>
      </s-table-cell>
      <s-table-cell>
        <SkeletonBox width="40px" height="13px" />
      </s-table-cell>
      <s-table-cell>
        <SkeletonBox width="60px" height="13px" />
      </s-table-cell>
      <s-table-cell>
        <SkeletonBox width="90px" height="13px" />
      </s-table-cell>
      <s-table-cell>
        <SkeletonBox width="70px" height="22px" radius="12px" />
      </s-table-cell>
      <s-table-cell>
        <SkeletonBox width="80px" height="13px" />
      </s-table-cell>
    </s-table-row>
  );
}

export default function RequestsTableSkeleton() {
  return (
    <s-page heading="Withdrawal requests">
      <s-stack direction="block" gap="large-100">
        <SkeletonBox width="70%" height="14px" />

        <s-section>
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
              <s-stack direction="inline" gap="small-200">
                <SkeletonBox width="70px" height="32px" radius="base" />
                <SkeletonBox width="70px" height="32px" radius="base" />
                <SkeletonBox width="90px" height="32px" radius="base" />
                <SkeletonBox width="90px" height="32px" radius="base" />
              </s-stack>
              <SkeletonBox width="220px" height="32px" radius="base" />
            </s-stack>

            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header>Order</s-table-header>
                <s-table-header>Customer</s-table-header>
                <s-table-header>Items</s-table-header>
                <s-table-header>Value</s-table-header>
                <s-table-header>Reason</s-table-header>
                <s-table-header>Status</s-table-header>
                <s-table-header>Submitted</s-table-header>
              </s-table-header-row>
              <s-table-body>
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
              </s-table-body>
            </s-table>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}
