/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";

const FORM_TABS = [
  { key: "step1", label: "1. Details" },
  { key: "confirm", label: "2. Confirm" },
  { key: "done", label: "3. Done" },
];

const LOCKED_FIELDS = ["Full name", "Email", "Order number"];

export default function FormFieldsEditor({ settings, update, activeTab, onTabChange, errors = {} }) {
  const [newReason, setNewReason] = useState("");
  const options = settings.reasonField.options ?? [];

  function addReason() {
    const value = newReason.trim();
    if (!value) return;
    if (options.some((option) => option.toLowerCase() === value.toLowerCase())) {
      setNewReason("");
      return;
    }
    update("reasonField.options", [...options, value]);
    setNewReason("");
  }

  function removeReason(index) {
    update(
      "reasonField.options",
      options.filter((_, i) => i !== index),
    );
  }

  return (
    <s-section>
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
          <s-heading>Form builder</s-heading>
          <s-stack direction="inline" gap="small-200">
            {FORM_TABS.map((tab) => (
              <s-button
                key={tab.key}
                variant={activeTab === tab.key ? "primary" : "secondary"}
                onClick={() => onTabChange(tab.key)}
              >
                {tab.label}
              </s-button>
            ))}
          </s-stack>
        </s-stack>

        <s-banner tone="info">
          Legally required fields — full name, email, and order number — are locked and
          pre-filled from the order.
        </s-banner>

        {activeTab === "step1" && (
          <s-stack direction="block" gap="base">
            <s-stack direction="block" gap="small-500">
              <s-heading>Before fulfillment</s-heading>
              <s-text color="subdued">
                Shown when the customer opens the form before their order ships.
              </s-text>
            </s-stack>
            <s-stack gap="small-200">
              <s-text-field
                label="Title"
                value={settings.labels.step1Title}
                onChange={(e) => update("labels.step1Title", e.currentTarget.value)}
              ></s-text-field>
              <s-text-area
                label="Description"
                rows={2}
                value={settings.labels.step1Description}
                onChange={(e) => update("labels.step1Description", e.currentTarget.value)}
              ></s-text-area>
              <s-text-field
                label="Item selection heading"
                value={settings.labels.itemSelectionHeading}
                onChange={(e) => update("labels.itemSelectionHeading", e.currentTarget.value)}
              ></s-text-field>
            </s-stack>
            <s-divider></s-divider>
            <s-stack direction="block" gap="small-500">
              <s-heading>After delivery</s-heading>
              <s-text color="subdued">
                Shown instead when the order has already been delivered.
              </s-text>
            </s-stack>
             <s-stack gap="small-200">
              <s-text-field
                label="Title"
                value={settings.labels.deliveredTitle}
                onChange={(e) => update("labels.deliveredTitle", e.currentTarget.value)}
              ></s-text-field>
              <s-text-area
                label="Description"
                rows={2}
                value={settings.labels.deliveredDescription}
                onChange={(e) => update("labels.deliveredDescription", e.currentTarget.value)}
              ></s-text-area>
              <s-text-field
                label="Delivered item selection heading"
                value={settings.labels.deliveredItemSelectionHeading}
                onChange={(e) =>
                  update("labels.deliveredItemSelectionHeading", e.currentTarget.value)
                }
              ></s-text-field>
            </s-stack>

            <s-divider></s-divider>

            <s-stack direction="block" gap="small-500">
              <s-heading>Customer details</s-heading>
              <s-text color="subdued">
                Pre-filled from the order — customers can&apos;t edit them.
              </s-text>
            </s-stack>
            <s-box border="base" borderRadius="base" padding="small-200">
              <s-stack direction="block" gap="small-200">
                {LOCKED_FIELDS.map((field, index) => (
                  <s-stack key={field} direction="block" gap="small-200">
                    {index > 0 && <s-divider></s-divider>}
                    <s-stack direction="inline" alignItems="center" justifyContent="space-between">
                      <s-text>{field}</s-text>
                      <s-badge>Locked</s-badge>
                    </s-stack>
                  </s-stack>
                ))}
              </s-stack>
            </s-box>

            <s-divider></s-divider>
            <s-stack gap="small-200">
              <s-heading>Optional reason field</s-heading>
              <s-checkbox
                label="Ask for a reason"
                details="Customers aren't required to give one — the field stays optional to remain compliant."
                checked={settings.reasonField.enabled}
                onChange={(e) => update("reasonField.enabled", e.currentTarget.checked)}
              ></s-checkbox>

              {settings.reasonField.enabled && (
                <s-stack direction="block" gap="base">
                  <s-text-field
                    label="Reason field label"
                    value={settings.reasonField.label}
                    error={errors["reasonField.label"]}
                    onChange={(e) => update("reasonField.label", e.currentTarget.value)}
                  ></s-text-field>

                  <s-stack direction="block" gap="small-200">
                    <s-text type="strong">Reason options</s-text>
                    <s-text color="subdued">
                      Shoppers pick from this list. Add, remove, or reword the options to match your
                      store.
                    </s-text>
                    {errors["reasonField.options"] && (
                      <s-text tone="critical">{errors["reasonField.options"]}</s-text>
                    )}

                    {options.length > 0 && (
                      <s-box border="base" borderRadius="base" padding="small-200">
                        <s-stack direction="block" gap="small-200">
                          {options.map((option, index) => (
                            <s-stack key={option} direction="block" gap="small-200">
                              {index > 0 && <s-divider></s-divider>}
                              <s-stack
                                direction="inline"
                                alignItems="center"
                                justifyContent="space-between"
                              >
                                <s-text>{option}</s-text>
                                <s-button
                                  variant="tertiary"
                                  tone="critical"
                                  accessibilityLabel={`Remove ${option}`}
                                  onClick={() => removeReason(index)}
                                >
                                  Remove
                                </s-button>
                              </s-stack>
                            </s-stack>
                          ))}
                        </s-stack>
                      </s-box>
                    )}

                    <s-stack direction="inline" gap="small-200">
                      <s-text-field
                        label="Add a reason"
                        labelAccessibilityVisibility="exclusive"
                        placeholder='Add a reason, e.g. "Ordered by mistake"'
                        value={newReason}
                        onInput={(e) => setNewReason(e.currentTarget.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addReason();
                          }
                        }}
                      ></s-text-field>
                      <s-button onClick={addReason} disabled={!newReason.trim() || undefined}>
                        Add
                      </s-button>
                    </s-stack>
                  </s-stack>
                </s-stack>
              )}
            </s-stack>
            <s-divider></s-divider>

            <s-text-field
              label="Continue button label"
              value={settings.labels.step1ButtonLabel}
              onChange={(e) => update("labels.step1ButtonLabel", e.currentTarget.value)}
            ></s-text-field>
          </s-stack>
        )}

        {activeTab === "confirm" && (
          <s-stack direction="block" gap="small-200">
            <s-text-field
              label="Confirmation heading"
              value={settings.labels.confirmHeading}
              onChange={(e) => update("labels.confirmHeading", e.currentTarget.value)}
            ></s-text-field>
            <s-text-area
              label="Pre-fulfillment confirmation message"
              rows={3}
              value={settings.labels.confirmMessage}
              onChange={(e) => update("labels.confirmMessage", e.currentTarget.value)}
            ></s-text-area>
            <s-text-area
              label="Delivered-order confirmation message"
              rows={3}
              value={settings.labels.deliveredConfirmMessage}
              onChange={(e) => update("labels.deliveredConfirmMessage", e.currentTarget.value)}
            ></s-text-area>
            <s-text-area
              label="Declaration"
              rows={2}
              value={settings.labels.declaration}
              onChange={(e) => update("labels.declaration", e.currentTarget.value)}
            ></s-text-area>
            <s-text-field
              label="Confirm button label"
              value={settings.labels.confirmButtonLabel}
              onChange={(e) => update("labels.confirmButtonLabel", e.currentTarget.value)}
            ></s-text-field>
          </s-stack>
        )}

        {activeTab === "done" && (
          <s-stack direction="block" gap="small-200">
            <s-text-field
              label="Submitted title"
              value={settings.labels.submittedTitle}
              onChange={(e) => update("labels.submittedTitle", e.currentTarget.value)}
            ></s-text-field>
            <s-text-area
              label="Submitted message"
              rows={2}
              value={settings.labels.submittedMessage}
              onChange={(e) => update("labels.submittedMessage", e.currentTarget.value)}
            ></s-text-area>
            <s-text-field
              label="Delivered submitted title"
              value={settings.labels.deliveredSubmittedTitle}
              onChange={(e) => update("labels.deliveredSubmittedTitle", e.currentTarget.value)}
            ></s-text-field>
            <s-text-area
              label="Delivered submitted message"
              rows={2}
              value={settings.labels.deliveredSubmittedMessage}
              onChange={(e) =>
                update("labels.deliveredSubmittedMessage", e.currentTarget.value)
              }
            ></s-text-area>
          </s-stack>
        )}
      </s-stack>
    </s-section>
  );
}
