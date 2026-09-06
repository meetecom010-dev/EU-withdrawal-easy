/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import { AVAILABLE_LANGUAGES, BASE_LOCALE } from "../constants";

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

// A translation error path (`translations.de.labels.step1Title`,
// `translations.de.reasonOptions.0`) maps back to its English-base equivalent so
// the same TAB_FIELDS lookup finds which step tab it belongs to.
function baseFieldPath(path) {
  const match = /^translations\.[^.]+\.(.+)$/.exec(path);
  if (!match) return path;
  const rest = match[1];
  if (rest.startsWith("labels.")) return rest;
  if (rest === "reasonLabel") return "reasonField.label";
  if (rest.startsWith("reasonOptions")) return "reasonField.options";
  return rest;
}

export function tabForErrorPath(path) {
  const base = baseFieldPath(path);
  return Object.keys(TAB_FIELDS).find((tab) => TAB_FIELDS[tab].includes(base)) ?? null;
}

// Which language tab an error belongs to — a `translations.<lang>.` path points
// at that language, everything else at the English base.
export function localeForErrorPath(path) {
  const match = /^translations\.([^.]+)\./.exec(path);
  return match ? match[1] : BASE_LOCALE;
}

function languageName(code) {
  return AVAILABLE_LANGUAGES.find((lang) => lang.code === code)?.name ?? code.toUpperCase();
}

export default function FormFieldsEditor({
  settings,
  update,
  activeTab,
  onTabChange,
  activeLocale = BASE_LOCALE,
  onLocaleChange,
  errors = {},
  dismissError,
}) {
  const [newReason, setNewReason] = useState("");
  const options = settings.reasonField.options ?? [];

  // "en" edits the base copy (labels / reasonField); any other code edits that
  // locale's sparse translation, with the English value shown as a placeholder.
  const isBase = activeLocale === BASE_LOCALE;
  const translation = settings.translations?.[activeLocale] ?? {};
  const tLabels = translation.labels ?? {};
  const tReasonOptions = translation.reasonOptions ?? [];

  // The language tabs the merchant can switch between — English first, then
  // every other offered language (managed on the Languages card below).
  const localeTabs = [
    BASE_LOCALE,
    ...(settings.languages ?? []).filter((code) => code !== BASE_LOCALE),
  ];

  // Every field under `labels` is wired the same way, so they share one
  // binding — that's what guarantees none of them is left on an event that
  // fires too late for the save bar. See ../fieldValue.js for why it's
  // `input` and not `change`. On a translation tab it writes into
  // `translations[locale].labels.*` instead and shows the English text as the
  // placeholder, so an untranslated field visibly falls back to English.
  function labelField(key) {
    if (isBase) {
      const path = `labels.${key}`;
      return {
        value: settings.labels[key],
        error: errors[path],
        onInput: (e) => update(path, e.currentTarget.value),
        onFocus: () => dismissError(path),
      };
    }
    const path = `translations.${activeLocale}.labels.${key}`;
    return {
      value: tLabels[key] ?? "",
      placeholder: settings.labels[key],
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

  // Positional translation of one reason option — the array lines up index for
  // index with the English `options`, padded with blanks so a later option can
  // be translated before an earlier one.
  function setTranslatedOption(index, value) {
    const next = [...tReasonOptions];
    while (next.length <= index) next.push("");
    next[index] = value;
    update(`translations.${activeLocale}.reasonOptions`, next);
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

        {/* Language tabs — only shown once the merchant offers more than
            English (managed on the Languages card). Switching a tab retargets
            every field below at that language's translation. */}
        {localeTabs.length > 1 && (
          <s-stack direction="block" gap="small-200">
            <s-stack direction="inline" gap="small-200" alignItems="center">
              <s-text type="strong">Language</s-text>
              <s-badge tone={isBase ? "info" : "caution"}>
                {isBase ? "Base language" : "Translation"}
              </s-badge>
            </s-stack>
            <s-stack direction="inline" gap="small-200">
              {localeTabs.map((code) => (
                <s-button
                  key={code}
                  variant={activeLocale === code ? "primary" : "secondary"}
                  onClick={() => onLocaleChange(code)}
                >
                  {languageName(code)}
                </s-button>
              ))}
            </s-stack>
          </s-stack>
        )}

        {isBase ? (
          <s-banner tone="info">
            Legally required fields — full name, email, and order number — are locked and
            pre-filled from the order.
          </s-banner>
        ) : (
          <s-banner tone="info">
            Editing the {languageName(activeLocale)} translation. Every field is prefilled with a
            default translation — adjust the wording to match your store. Fields can&apos;t be left
            blank; the English text is shown as a placeholder for reference.
          </s-banner>
        )}

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

            {isBase && (
              <>
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
                        <s-stack
                          direction="inline"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <s-text>{field}</s-text>
                          <s-badge>Locked</s-badge>
                        </s-stack>
                      </s-stack>
                    ))}
                  </s-stack>
                </s-box>
              </>
            )}

            <s-divider></s-divider>
            <s-stack gap="small-200">
              <s-heading>Optional reason field</s-heading>
              {isBase && (
                <s-checkbox
                  label="Ask for a reason"
                  details="Customers aren't required to give one — the field stays optional to remain compliant."
                  checked={settings.reasonField.enabled}
                  onChange={(e) => update("reasonField.enabled", e.currentTarget.checked)}
                ></s-checkbox>
              )}

              {settings.reasonField.enabled &&
                (isBase ? (
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
                        Shoppers pick from this list. Add, remove, or reword the options to match
                        your store.
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

                      <s-grid gridTemplateColumns="1fr auto" gap="small-200" alignItems="start">
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
                      </s-grid>
                    </s-stack>
                  </s-stack>
                ) : (
                  <s-stack direction="block" gap="base">
                    <s-text-field
                      label="Reason field label"
                      value={translation.reasonLabel ?? ""}
                      placeholder={settings.reasonField.label}
                      error={errors[`translations.${activeLocale}.reasonLabel`]}
                      onFocus={() => dismissError(`translations.${activeLocale}.reasonLabel`)}
                      onInput={(e) =>
                        update(`translations.${activeLocale}.reasonLabel`, e.currentTarget.value)
                      }
                    ></s-text-field>

                    <s-stack direction="block" gap="small-200">
                      <s-text type="strong">Reason options</s-text>
                      <s-text color="subdued">
                        Translate each option. The list itself is managed on the English tab.
                      </s-text>
                      {options.length === 0 ? (
                        <s-text color="subdued">Add reason options on the English tab first.</s-text>
                      ) : (
                        options.map((option, index) => (
                          <s-text-field
                            key={option}
                            label={option}
                            value={tReasonOptions[index] ?? ""}
                            placeholder={option}
                            error={errors[`translations.${activeLocale}.reasonOptions.${index}`]}
                            onFocus={() =>
                              dismissError(`translations.${activeLocale}.reasonOptions.${index}`)
                            }
                            onInput={(e) => setTranslatedOption(index, e.currentTarget.value)}
                          ></s-text-field>
                        ))
                      )}
                    </s-stack>
                  </s-stack>
                ))}
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
