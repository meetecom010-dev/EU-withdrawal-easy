/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */

function StatBlock({ label, count, badgeLabel, tone }) {
  return (
    <s-stack direction="block" gap="small-200">
      <s-text type="strong">{label}</s-text>
      <s-stack direction="inline" gap="small-200" alignItems="center">
        <s-text>{count}</s-text>
        <s-badge tone={tone}>{badgeLabel}</s-badge>
      </s-stack>
    </s-stack>
  );
}

export default function RequestsStatsBar({ requests }) {
  const open = requests.filter((request) => request.status === "pending").length;
  const processed = requests.filter((request) => request.status !== "pending").length;
  const total = requests.length;

  return (
    <s-box padding="large-100" borderWidth="base" borderRadius="large" background="base">
      <s-grid gridTemplateColumns="1fr auto 1fr auto 1fr" gap="large-100" alignItems="stretch">
        <StatBlock label="Open" count={open} badgeLabel="Needs action" tone="success" />
        <s-divider direction="block"></s-divider>
        <StatBlock label="Processed" count={processed} badgeLabel="Closed" tone="success" />
        <s-divider direction="block"></s-divider>
        <StatBlock label="Total" count={total} badgeLabel="All" tone="info" />
      </s-grid>
    </s-box>
  );
}
