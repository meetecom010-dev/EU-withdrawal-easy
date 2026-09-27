/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import { toNumberValue } from "../fieldValue";

export default function DeadlineCard({ settings, update, errors = {}, dismissError }) {
  const { t } = useTranslation();

  return (
    <s-section heading={t("formSetup.deadline.heading")}>
      <s-stack direction="block" gap="base">
        <s-paragraph color="subdued">{t("formSetup.deadline.description")}</s-paragraph>
        <s-grid gridTemplateColumns="1fr 1fr" gap="large-100">
          <s-number-field
            label={t("formSetup.deadline.days")}
            details={t("formSetup.deadline.daysDetails")}
            value={String(settings.deadline.daysAfterDelivery)}
            min={1}
            max={365}
            error={errors["deadline.daysAfterDelivery"]}
            onInput={(e) =>
              update("deadline.daysAfterDelivery", toNumberValue(e.currentTarget.value))
            }
            onFocus={() => dismissError("deadline.daysAfterDelivery")}
          ></s-number-field>
          <s-number-field
            label={t("formSetup.deadline.transit")}
            details={t("formSetup.deadline.transitDetails")}
            value={String(settings.deadline.estimatedTransitDays)}
            min={0}
            max={90}
            error={errors["deadline.estimatedTransitDays"]}
            onInput={(e) =>
              update("deadline.estimatedTransitDays", toNumberValue(e.currentTarget.value))
            }
            onFocus={() => dismissError("deadline.estimatedTransitDays")}
          ></s-number-field>
        </s-grid>
      </s-stack>
    </s-section>
  );
}
