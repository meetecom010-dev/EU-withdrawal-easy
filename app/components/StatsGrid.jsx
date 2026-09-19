/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useNavigate } from "react-router";

// Shared summary tiles — used on the dashboard (Home) and on top of the
// withdrawal requests table, so both read the same "Open / Today / This
// month / Closed" numbers from getDashboardStats() rather than each page
// computing its own slice of the requests list.
function StatCard({ title, tone, count, countLabel, description }) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small-200">
        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-text fontWeight="bold">{title}</s-text>
          <s-badge tone={tone}>{count}</s-badge>
        </s-stack>
        <s-text>
          {count} {countLabel}
        </s-text>
        <s-text color="subdued">{description}</s-text>
      </s-stack>
    </s-box>
  );
}

export default function StatsGrid({ stats, showHeader = true }) {
  const navigate = useNavigate();

  return (
    <s-section>
      <s-stack direction="block" gap="base">
        {showHeader && (
          <s-grid gridTemplateColumns="1fr auto" gap="small-300" alignItems="center">
            <s-heading>Overview</s-heading>
            <s-button variant="primary" onClick={() => navigate("/withdrawal-requests")}>
              View requests
            </s-button>
          </s-grid>
        )}
        <s-grid gridTemplateColumns="1fr 1fr 1fr 1fr" gap="base">
          <StatCard
            title="Open"
            tone="success"
            count={stats.openRequests}
            countLabel="withdrawals"
            // description="Awaiting your action"
          />
          <StatCard
            title="Today"
            tone="info"
            count={stats.submittedToday}
            countLabel="requests"
            // description="New requests"
          />
          <StatCard
            title="This month"
            tone="info"
            count={stats.submittedThisMonth}
            countLabel="withdrawals"
            // description="Withdrawals received"
          />
          <StatCard
            title="Closed"
            tone="success"
            count={stats.closedRequests}
            countLabel="withdrawals"
            // description="Approved, completed or declined"
          />
        </s-grid>
      </s-stack>
    </s-section>
  );
}
