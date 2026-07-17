/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
export default function DpaStep({ accepted, onAcceptedChange, onViewAgreement }) {
  return (
    <s-stack direction="block" gap="base">
      <s-heading>Data Processing Agreement 📄</s-heading>
      <s-paragraph color="subdued">
        This app handles personal data — customer names, emails, and order
        details — on your behalf in order to process withdrawal requests.
        Under GDPR, that requires a signed Data Processing Agreement (DPA)
        between you and us before the app can start handling that data.
      </s-paragraph>
      <s-link
        href="#"
        onClick={(event) => {
          event.preventDefault();
          onViewAgreement?.();
        }}
      >
        View the Data Processing Agreement ↗
      </s-link>
      <s-box padding="base" borderWidth="base" borderRadius="base">
        <s-checkbox
          label="I accept the Data Processing Agreement"
          checked={accepted}
          onChange={(event) => onAcceptedChange(event.target.checked)}
        ></s-checkbox>
      </s-box>
      <s-banner tone="info">
        <s-paragraph>
          You can accept this later from the dashboard — but the app
          can&rsquo;t process any withdrawal requests until it&rsquo;s signed.
        </s-paragraph>
      </s-banner>
    </s-stack>
  );
}
