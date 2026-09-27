/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";

export default function PlanCard({ name, price, features, isCurrent, onSelect, isSelecting }) {
  const { t } = useTranslation();

  return (
    <s-section heading={name}>
      <s-stack direction="block" gap="base">
        <s-heading>{price}</s-heading>
        <s-unordered-list>
          {features.map((feature) => (
            <s-list-item key={feature}>{feature}</s-list-item>
          ))}
        </s-unordered-list>
        {isCurrent ? (
          <s-badge tone="success">{t("pricing.currentPlan")}</s-badge>
        ) : (
          <s-button
            variant="primary"
            onClick={onSelect}
            {...(isSelecting ? { loading: true } : {})}
          >
            {t("pricing.choosePlan", { plan: name })}
          </s-button>
        )}
      </s-stack>
    </s-section>
  );
}
