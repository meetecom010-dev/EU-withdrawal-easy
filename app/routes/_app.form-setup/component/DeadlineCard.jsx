/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { toNumberValue } from "../fieldValue";

export default function DeadlineCard({ settings, update, errors = {}, dismissError }) {
  return (
    <s-section heading="Withdrawal deadline">
      <s-stack direction="block" gap="base">
        <s-paragraph color="subdued">
          The withdrawal window starts on the day the order is delivered, not the day it was
          placed. EU law requires at least 14 days.
        </s-paragraph>
        <s-grid gridTemplateColumns="1fr 1fr" gap="large-100">
          <s-number-field
            label="Days available after delivery"
            details="How long customers can withdraw once the order arrives."
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
            label="Estimated transit days"
            details="Used to estimate the delivery date when the carrier doesn't confirm one."
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
