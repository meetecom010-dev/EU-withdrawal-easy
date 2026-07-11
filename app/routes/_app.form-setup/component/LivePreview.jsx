/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useEffect, useState } from "react";

// Same sample products a fresh Shopify dev store ships with — the preview
// isn't tied to a real order, so it uses these as realistic stand-ins.
const SAMPLE_ITEMS = [
  { id: "1", title: "The Complete Snowboard", price: "612.95" },
  { id: "2", title: "Selling Plans Ski Wax", price: "19.99" },
];

const DOT_STYLE = { width: 8, height: 8, borderRadius: "50%", background: "#d4d4d4" };

function ItemThumbnail({ index }) {
  return (
    <div style={{ position: "relative", width: 34, height: 34, flexShrink: 0 }}>
      <s-box background="subdued" borderRadius="base" inlineSize="34px" blockSize="34px"></s-box>
      <div
        style={{
          position: "absolute",
          top: -6,
          left: -6,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#1a1a1a",
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {index + 1}
      </div>
    </div>
  );
}

// Purely decorative "browser chrome" around the preview content — Polaris
// web components don't have a browser-frame primitive, so this is plain
// markup, styled to match the storefront mockup this page is based on.
function BrowserFrame({ children }) {
  return (
    <div style={{ border: "1px solid #e3e3e3", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      <div
        style={{
          height: 36,
          background: "#f1f1f1",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 12px",
          borderBottom: "1px solid #e3e3e3",
        }}
      >
        <span style={DOT_STYLE}></span>
        <span style={DOT_STYLE}></span>
        <span style={DOT_STYLE}></span>
        <span
          style={{
            marginLeft: 12,
            background: "#fff",
            border: "1px solid #e3e3e3",
            borderRadius: 20,
            fontSize: 11,
            color: "#8a8a8a",
            padding: "3px 12px",
            flex: 1,
          }}
        >
          yourstore.com/pages/withdrawal
        </span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// Starts out mirroring whichever tab is active in FormFieldsEditor, but the
// Continue/Confirm buttons below can advance it on their own from there —
// letting merchants click through the whole flow as a demo instead of only
// seeing one static step at a time. Switching tabs on the left still resets
// the walkthrough back to that step, so the tab bar remains the source of
// truth for "which step am I editing".
export default function LivePreview({ settings, activeTab }) {
  const [selectedIds, setSelectedIds] = useState(["1"]);
  const [previewStep, setPreviewStep] = useState(activeTab);

  useEffect(() => {
    setPreviewStep(activeTab);
  }, [activeTab]);

  const selectedItems = SAMPLE_ITEMS.filter((item) => selectedIds.includes(item.id));
  const reasonOptions = settings.reasonField.options ?? [];

  function toggleItem(id, checked) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  const stepNumber = previewStep === "step1" ? 1 : previewStep === "confirm" ? 2 : 3;

  return (
    <s-section>
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="small-200" alignItems="center" justifyContent="space-between">
          <s-text type="strong">Live preview</s-text>
          <s-badge tone="success">Two-step compliant</s-badge>
        </s-stack>

        <BrowserFrame>
          {previewStep === "step1" && (
            <s-stack direction="block" gap="base">
              <s-heading>{settings.labels.step1Title}</s-heading>
              <s-paragraph color="subdued">{settings.labels.step1Description}</s-paragraph>
              <s-stack direction="inline" gap="base" alignItems="center">
                <s-text type="strong">{settings.labels.itemSelectionHeading}</s-text>
              </s-stack>
              {SAMPLE_ITEMS.map((item, index) => (
                <s-stack
                  key={item.id}
                  direction="inline"
                  gap="base"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <s-stack direction="inline" gap="base" alignItems="center">
                    <s-checkbox
                      label=""
                      accessibilityLabel={item.title}
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => toggleItem(item.id, e.currentTarget.checked)}
                    ></s-checkbox>
                    <ItemThumbnail index={index} />
                    <s-stack>
                      <s-text type="strong">{item.title}</s-text>
                      <s-text color="subdued">€{item.price}</s-text>
                    </s-stack>
                  </s-stack>
                </s-stack>
              ))}
              <s-text-field label="Full name" value="Jane Doe" disabled></s-text-field>
              <s-text-field label="Email" value="jane@example.com" disabled></s-text-field>
              <s-text-field label="Order number" value="#1001" disabled></s-text-field>
              {settings.reasonField.enabled && (
                <s-select label={settings.reasonField.label} name="reason">
                  {reasonOptions.map((option) => (
                    <s-option key={option} value={option}>
                      {option}
                    </s-option>
                  ))}
                </s-select>
              )}
              <s-button variant="primary" onClick={() => setPreviewStep("confirm")}>
                {settings.labels.step1ButtonLabel}
              </s-button>
            </s-stack>
          )}

          {previewStep === "confirm" && (
            <s-stack direction="block" gap="base">
              <s-heading>{settings.labels.confirmHeading}</s-heading>
              <s-paragraph color="subdued">{settings.labels.confirmMessage}</s-paragraph>
              <s-text type="strong">
                Items to withdraw: {selectedItems.map((i) => i.title).join(", ")}
              </s-text>
              <s-paragraph color="subdued">{settings.labels.declaration}</s-paragraph>
              <s-stack direction="inline" gap="base" justifyContent="space-between">
                <s-button variant="tertiary" onClick={() => setPreviewStep("step1")}>
                  Back
                </s-button>
                <s-button variant="primary" onClick={() => setPreviewStep("done")}>
                  {settings.labels.confirmButtonLabel}
                </s-button>
              </s-stack>
            </s-stack>
          )}

          {previewStep === "done" && (
            <s-stack direction="block" gap="base">
              <s-banner tone="success" heading={settings.labels.submittedTitle}></s-banner>
              <s-paragraph color="subdued">{settings.labels.submittedMessage}</s-paragraph>
              <s-text color="subdued">Submitted on {new Date().toLocaleDateString()}</s-text>
              <s-text type="strong">Items to withdraw</s-text>
              {selectedItems.map((item) => (
                <s-stack key={item.id} direction="inline" gap="small-200" alignItems="center">
                  <s-text>{item.title}</s-text>
                  <s-text color="subdued">€{item.price}</s-text>
                </s-stack>
              ))}
              <s-button variant="tertiary" onClick={() => setPreviewStep("step1")}>
                Preview again
              </s-button>
            </s-stack>
          )}
        </BrowserFrame>

        <s-banner tone="info">
          Click through the buttons above to preview the full flow customers see. The tab bar on
          the left still jumps the preview straight to that step.
        </s-banner>

        <s-stack direction="inline" justifyContent="end">
          <s-text color="subdued">Step {stepNumber} of 3</s-text>
        </s-stack>
      </s-stack>
    </s-section>
  );
}
