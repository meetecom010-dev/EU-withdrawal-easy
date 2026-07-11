/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
export default function WithdrawalStep({
  enabled,
  onEnabledChange,
  blockAdded,
  onBlockAddedChange,
  onOpenCheckoutSettings,
}) {
  return (
    <s-stack direction="block" gap="base">
      <s-heading>Turn on your withdrawal form 📝</s-heading>
      <s-paragraph color="subdued">
        Customers submit their intent to withdraw, then give a separate
        explicit confirmation — exactly what Article 11a requires. Sensible
        defaults are already filled in: legal wording and a 14-day timeline
        from delivery.
      </s-paragraph>

      <s-switch
        label="Enable the withdrawal form"
        checked={enabled}
        onChange={(event) => onEnabledChange(event.target.checked)}
      ></s-switch>

      <s-box padding="base" borderWidth="base" borderRadius="base">
        <s-stack direction="block" gap="small-200">
          <s-heading>Show it on your storefront</s-heading>
          <s-paragraph color="subdued">
            The button needs to be placed on the order status page before
            customers can see it. Open checkout settings, add the
            &ldquo;Withdrawal button&rdquo; block, then confirm it below.
          </s-paragraph>
          <s-button variant="secondary" onClick={onOpenCheckoutSettings}>
            Open checkout settings
          </s-button>
          <s-checkbox
            label="I've added the block to my theme"
            checked={blockAdded}
            onChange={(event) => onBlockAddedChange(event.target.checked)}
          ></s-checkbox>
        </s-stack>
      </s-box>

      <s-banner tone="info">
        <s-paragraph>
          Nothing here is final — wording, languages, deadlines, automation,
          and placement can all be changed anytime from Form Setup.
        </s-paragraph>
      </s-banner>
    </s-stack>
  );
}
