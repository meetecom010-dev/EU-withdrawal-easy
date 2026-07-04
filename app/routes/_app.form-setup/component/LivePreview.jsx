/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
export default function LivePreview({ fields, reasons }) {
  return (
    <s-section heading="Preview">
      <s-stack direction="block" gap="base">
        <s-text color="subdued">Fields customers will fill in</s-text>
        <s-unordered-list>
          {fields.map((field) => (
            <s-list-item key={field}>{field}</s-list-item>
          ))}
        </s-unordered-list>
        <s-text color="subdued">Reasons customers can pick from</s-text>
        <s-unordered-list>
          {reasons.map((reason) => (
            <s-list-item key={reason}>{reason}</s-list-item>
          ))}
        </s-unordered-list>
      </s-stack>
    </s-section>
  );
}
