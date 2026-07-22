/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";

const FORM_TABS = [
  { key: "step1", label: "1. Details" },
  { key: "confirm", label: "2. Confirm" },
  { key: "done", label: "3. Done" },
];

const LOCKED_FIELDS = ["Full name", "Email", "Order number"];

// Which tab each validatable field sits on. A save attempt uses this to open
// the tab holding the first problem — otherwise an invalid field on a closed
// tab would show no message anywhere and Save would look inert.
const TAB_FIELDS = {
  step1: [
    "labels.step1Title",
    "labels.step1Description",
    "labels.itemSelectionHeading",
    "labels.deliveredTitle",
    "labels.deliveredDescription",
    "labels.deliveredItemSelectionHeading",
    "reasonField.label",
    "reasonField.options",
    "labels.step1ButtonLabel",
  ],
  confirm: [
    "labels.confirmHeading",
    "labels.confirmMessage",
    "labels.deliveredConfirmMessage",
    "labels.declaration",
    "labels.confirmButtonLabel",
  ],
  done: [
    "labels.submittedTitle",
    "labels.submittedMessage",
    "labels.deliveredSubmittedTitle",
    "labels.deliveredSubmittedMessage",
  ],
};

export function tabForErrorPath(path) {
  return Object.keys(TAB_FIELDS).find((tab) => TAB_FIELDS[tab].includes(path)) ?? null;
}

export default function FormFieldsEditor({
  settings,
  update,
  activeTab,
  onTabChange,
  errors = {},
  dismissError,
}) {
  const [newReason, setNewReason] = useState("");
  const options = settings.reasonField.options ?? [];

  // Every field under `labels` is wired the same way, so they share one
  // binding — that's what guarantees none of them is left on an event that
  // fires too late for the save bar. See ../fieldValue.js for why it's
  // `input` and not `change`.
  function labelField(key) {
    const path = `labels.${key}`;
    return {
      value: settings.labels[key],
      error: errors[path],
      onInput: (e) => update(path, e.currentTarget.value),
      onFocus: () => dismissError(path),
    };
  }

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
              <s-text-field label="Title" {...labelField("step1Title")}></s-text-field>
              <s-text-area
                label="Description"
                rows={2}
                {...labelField("step1Description")}
              ></s-text-area>
              <s-text-field
                label="Item selection heading"
                {...labelField("itemSelectionHeading")}
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
              <s-text-field label="Title" {...labelField("deliveredTitle")}></s-text-field>
              <s-text-area
                label="Description"
                rows={2}
                {...labelField("deliveredDescription")}
              ></s-text-area>
              <s-text-field
                label="Delivered item selection heading"
                {...labelField("deliveredItemSelectionHeading")}
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
                    onInput={(e) => update("reasonField.label", e.currentTarget.value)}
                    onFocus={() => dismissError("reasonField.label")}
                  ></s-text-field>

                  <s-stack direction="block" gap="small-200">
                    <s-text type="strong">Reason options</s-text>
                    <s-text color="subdued">
                      Shoppers pick from this list. Add, remove, or reword the options to match your
                      store.
                    </s-text>
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
                        // "Add at least one reason option" belongs to the list,
                        // and this composer is the control that fixes it.
                        error={errors["reasonField.options"]}
                        onFocus={() => dismissError("reasonField.options")}
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
              {...labelField("step1ButtonLabel")}
            ></s-text-field>
          </s-stack>
        )}

        {activeTab === "confirm" && (
          <s-stack direction="block" gap="small-200">
            <s-text-field
              label="Confirmation heading"
              {...labelField("confirmHeading")}
            ></s-text-field>
            <s-text-area
              label="Pre-fulfillment confirmation message"
              rows={3}
              {...labelField("confirmMessage")}
            ></s-text-area>
            <s-text-area
              label="Delivered-order confirmation message"
              rows={3}
              {...labelField("deliveredConfirmMessage")}
            ></s-text-area>
            <s-text-area
              label="Declaration"
              rows={2}
              {...labelField("declaration")}
            ></s-text-area>
            <s-text-field
              label="Confirm button label"
              {...labelField("confirmButtonLabel")}
            ></s-text-field>
          </s-stack>
        )}

        {activeTab === "done" && (
          <s-stack direction="block" gap="small-200">
            <s-text-field label="Submitted title" {...labelField("submittedTitle")}></s-text-field>
            <s-text-area
              label="Submitted message"
              rows={2}
              {...labelField("submittedMessage")}
            ></s-text-area>
            <s-text-field
              label="Delivered submitted title"
              {...labelField("deliveredSubmittedTitle")}
            ></s-text-field>
            <s-text-area
              label="Delivered submitted message"
              rows={2}
              {...labelField("deliveredSubmittedMessage")}
            ></s-text-area>
          </s-stack>
        )}
      </s-stack>
    </s-section>
  );
}
