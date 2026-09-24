import SkeletonBox from "../../../components/skeleton/SkeletonBox";

// Mirrors the loaded Withdrawal requests page: the shared StatsGrid tiles
// (see components/StatsGrid.jsx) followed by RequestsTable's padding="none"
// section — search + export row, the four status tabs, then the eight-column
// table (checkbox → actions) at PAGE_SIZE rows — so nothing shifts when the
// loader resolves.

// One StatsGrid tile: heading + "<count> requests" line.
function StatTileSkeleton() {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small-200">
        <SkeletonBox width="90px" height="18px" />
        <SkeletonBox width="70px" height="13px" />
      </s-stack>
    </s-box>
  );
}

function RowSkeleton() {
  return (
    <s-table-row>
      <s-table-cell>
        <SkeletonBox width="16px" height="16px" radius="4px" />
      </s-table-cell>
      <s-table-cell>
        <SkeletonBox width="60px" height="13px" />
      </s-table-cell>
      <s-table-cell>
        <SkeletonBox width="110px" height="13px" />
      </s-table-cell>
      <s-table-cell>
        <SkeletonBox width="55px" height="13px" />
      </s-table-cell>
      <s-table-cell>
        <SkeletonBox width="60px" height="13px" />
      </s-table-cell>
      <s-table-cell>
        <SkeletonBox width="70px" height="20px" radius="10px" />
      </s-table-cell>
      <s-table-cell>
        <SkeletonBox width="80px" height="13px" />
      </s-table-cell>
      <s-table-cell>
        <s-stack direction="inline" gap="small-200" justifyContent="end">
          <SkeletonBox width="28px" height="28px" radius="base" />
          <SkeletonBox width="28px" height="28px" radius="base" />
        </s-stack>
      </s-table-cell>
    </s-table-row>
  );
}

export default function RequestsTableSkeleton() {
  return (
    <s-page heading="Withdrawal requests">
      <s-stack direction="block" gap="large-100">
        {/* StatsGrid — "Overview" header (no View requests button here) + four tiles */}
        <s-section>
          <s-stack direction="block" gap="base">
            <s-stack direction="block" gap="small-500">
              <SkeletonBox width="90px" height="18px" />
              <SkeletonBox width="260px" height="13px" />
            </s-stack>
            <s-grid gridTemplateColumns="1fr 1fr 1fr 1fr" gap="base">
              <StatTileSkeleton />
              <StatTileSkeleton />
              <StatTileSkeleton />
              <StatTileSkeleton />
            </s-grid>
          </s-stack>
        </s-section>

        {/* RequestsTable */}
        <s-section padding="none">
          <s-stack direction="block" gap="base">
            <s-box padding="base" paddingBlockEnd="none">
              <s-stack direction="block" gap="base">
                <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
                  <SkeletonBox width="100%" height="32px" radius="base" />
                  <SkeletonBox width="80px" height="32px" radius="base" />
                </s-grid>
                <s-stack direction="inline" gap="small-200">
                  <SkeletonBox width="70px" height="32px" radius="base" />
                  <SkeletonBox width="80px" height="32px" radius="base" />
                  <SkeletonBox width="110px" height="32px" radius="base" />
                  <SkeletonBox width="105px" height="32px" radius="base" />
                </s-stack>
              </s-stack>
            </s-box>

            <s-stack direction="block" gap="none">
              <s-table variant="auto" paginate>
                <s-table-header-row>
                  <s-table-header>
                    <SkeletonBox width="16px" height="16px" radius="4px" />
                  </s-table-header>
                  {/* Bars, not the real labels — nothing on a skeleton should
                      read as loaded content. Each is sized to the header it
                      stands in for (Order, Customer name, ... Actions). */}
                  <s-table-header>
                    <SkeletonBox width="40px" height="12px" />
                  </s-table-header>
                  <s-table-header>
                    <SkeletonBox width="95px" height="12px" />
                  </s-table-header>
                  <s-table-header>
                    <SkeletonBox width="38px" height="12px" />
                  </s-table-header>
                  <s-table-header>
                    <SkeletonBox width="40px" height="12px" />
                  </s-table-header>
                  <s-table-header>
                    <SkeletonBox width="45px" height="12px" />
                  </s-table-header>
                  <s-table-header>
                    <SkeletonBox width="68px" height="12px" />
                  </s-table-header>
                  <s-table-header>
                    <s-box minBlockSize="2rem">
                      <s-stack direction="inline" justifyContent="end">
                        <SkeletonBox width="50px" height="12px" />
                      </s-stack>
                    </s-box>
                  </s-table-header>
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
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}
