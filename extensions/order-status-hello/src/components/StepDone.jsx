/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import OrderItemRow from "./OrderItemRow.jsx";
import { formatMoney, sumMoney } from "../lib/money.js";
import { t, formatLocaleDate } from "../lib/i18n.js";

// Step 3 of 3 — terminal confirmation screen, no further navigation.
export default function StepDone({ settings, lines, selectedLineIds }) {
  const selectedLines = lines.filter((line) => selectedLineIds.includes(line.id));
  const total = sumMoney(selectedLines.map((line) => line.cost?.totalAmount));

  return (
    <s-stack direction="block" gap="base">
      <s-banner tone="success" heading={settings.labels.submittedTitle}></s-banner>
      <s-paragraph color="subdued">{settings.labels.submittedMessage}</s-paragraph>
      <s-stack direction="inline" gap="small-200" alignItems="center">
        <s-icon type="check-circle-filled" tone="success" size="small"></s-icon>
        <s-text color="subdued">
          {t("done.submittedOn", { date: formatLocaleDate(new Date()) })}
        </s-text>
      </s-stack>

      <s-text type="strong">
        {t("confirm.itemsToWithdraw", { quantity: selectedLines.length })}
      </s-text>
      <s-stack direction="block" gap="small-200">
        {selectedLines.map((line) => (
          <OrderItemRow key={line.id} line={line} readOnly />
        ))}
      </s-stack>

      {total && (
        <>
          <s-divider></s-divider>
          <s-stack direction="inline" gap="base" justifyContent="space-between">
            <s-text type="strong">{t("confirm.selectedTotal")}</s-text>
            <s-text type="strong">{formatMoney(total)}</s-text>
          </s-stack>
        </>
      )}
    </s-stack>
  );
}
