/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { formatMoney } from "../../../_app.withdrawal-requests/constants";

export default function StatsGrid({ stats }) {
  return (
    <s-section heading="Withdrawal requests">
      <s-grid gridTemplateColumns="1fr 1fr 1fr 1fr" gap="base">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="small-200">
            <s-text color="subdued">Open requests</s-text>
            <s-heading>{stats.openRequests}</s-heading>
          </s-stack>
        </s-box>
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="small-200">
            <s-text color="subdued">Approved (30d)</s-text>
            <s-heading>{stats.approvedLast30}</s-heading>
          </s-stack>
        </s-box>
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="small-200">
            <s-text color="subdued">Approval rate</s-text>
            <s-heading>{stats.approvalRate === null ? "—" : `${stats.approvalRate}%`}</s-heading>
          </s-stack>
        </s-box>
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="small-200">
            <s-text color="subdued">Revenue at risk</s-text>
            <s-heading>{stats.revenueAtRisk ? formatMoney(stats.revenueAtRisk) : "—"}</s-heading>
          </s-stack>
        </s-box>
      </s-grid>
    </s-section>
  );
}
