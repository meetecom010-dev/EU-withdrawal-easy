/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useNavigate } from "react-router";

// Shared summary tiles — used on the dashboard (Home) and on top of the
// withdrawal requests table, so both read the same "All requests / Today /
// Open / Closed" numbers from getDashboardStats() rather than each page
// computing its own slice of the requests list.
function StatCard({ title, count, countLabel, description }) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small-200">
        <s-heading>{title}</s-heading>
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
            title="All requests"
            count={stats.openRequests + stats.closedRequests}
            countLabel="requests"
          />
          <StatCard
            title="Today"
            count={stats.submittedToday}
            countLabel="requests"
          />
          <StatCard
            title="Open"
            count={stats.openRequests}
            countLabel="withdrawals"
          />
          <StatCard
            title="Closed"
            count={stats.closedRequests}
            countLabel="withdrawals"
          />
        </s-grid>
      </s-stack>
    </s-section>
  );
}
