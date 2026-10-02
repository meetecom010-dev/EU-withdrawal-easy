/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

// Shared summary tiles — used on the dashboard (Home) and on top of the
// withdrawal requests table, so both read the same "Total / Today / Pending /
// Closed" numbers from getDashboardStats() rather than each page computing
// its own slice of the requests list.
function StatCard({ title, count }) {
  const { t } = useTranslation();
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small-200">
        <s-heading>{title}</s-heading>
        <s-text>{t("stats.requestCount", { count })}</s-text>
      </s-stack>
    </s-box>
  );
}

export default function StatsGrid({ stats, showHeader = true, showViewRequestsButton = true }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <s-section>
      <s-stack direction="block" gap="base">
        {showHeader && (
          <s-grid gridTemplateColumns="1fr auto" gap="small-300" alignItems="center">
            <s-stack direction="block" gap="small-500">
              <s-heading>{t("stats.heading")}</s-heading>
              <s-text color="subdued">{t("stats.description")}</s-text>
            </s-stack>
            {showViewRequestsButton && (
              <s-button variant="primary" onClick={() => navigate("/withdrawal-requests")}>
                {t("stats.viewRequests")}
              </s-button>
            )}
          </s-grid>
        )}
        {/* Four across on a wide page, two across on a phone. */}
        <s-query-container>
          <s-grid gridTemplateColumns="@container (inline-size > 600px) 1fr 1fr 1fr 1fr, 1fr 1fr" gap="base">
            <StatCard title={t("stats.total")} count={stats.openRequests + stats.closedRequests} />
            <StatCard title={t("stats.today")} count={stats.submittedToday} />
            <StatCard title={t("stats.pending")} count={stats.openRequests} />
            <StatCard title={t("stats.closed")} count={stats.closedRequests} />
          </s-grid>
        </s-query-container>
      </s-stack>
    </s-section>
  );
}
