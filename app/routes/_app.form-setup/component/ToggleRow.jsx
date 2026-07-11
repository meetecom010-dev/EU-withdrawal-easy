/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */

// A labeled switch row: title + description on the left, switch on the
// right. Shared by TurnItOnCard and AutomationCard.
export default function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
  accessibilityLabel = title,
}) {
  return (
    <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
      <s-stack direction="block" gap="small-200">
        <s-text type="strong">{title}</s-text>
        <s-text color="subdued">{description}</s-text>
      </s-stack>
      <s-switch
        label={accessibilityLabel}
        labelAccessibilityVisibility="exclusive"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      ></s-switch>
    </s-stack>
  );
}
