/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */

function StatCard({ title, tone, count, countLabel, description }) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small-200">
        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-heading>{title}</s-heading>
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

export default function StatsGrid({ stats }) {
  return (
    <s-section heading="Overview">
      <s-grid gridTemplateColumns="1fr 1fr 1fr 1fr" gap="base">
        <StatCard
          title="Open"
          tone="success"
          count={stats.openRequests}
          countLabel="withdrawals"
          description="Awaiting your action"
        />
        <StatCard
          title="Today"
          tone="info"
          count={stats.submittedToday}
          countLabel="requests"
          description="New requests"
        />
        <StatCard
          title="This month"
          tone="info"
          count={stats.submittedThisMonth}
          countLabel="withdrawals"
          description="Withdrawals received"
        />
        <StatCard
          title="Closed"
          tone="success"
          count={stats.closedRequests}
          countLabel="withdrawals"
          description="Approved, completed or declined"
        />
      </s-grid>
    </s-section>
  );
}
