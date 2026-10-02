/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BASE_LOCALE } from "../constants";
import { useFormatters } from "../../../i18n/react";

// Tab labels are formSetup.content.tabs.<key> in en.json.
const FORM_TABS = ["step1", "confirm", "done"];

// Read-only customer fields, labelled by formSetup.content.customerDetails.<key>.
const LOCKED_FIELDS = ["fullName", "email", "orderNumber"];

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
  const { t } = useTranslation();
  const { languageName } = useFormatters();
  const [newReason, setNewReason] = useState("");
  const options = settings.reasonField.options ?? [];
  // Shown under the description fields. The token is passed in as a value so
  // it prints literally instead of being filled in by the translation.
  const daysHint = t("formSetup.content.daysHint", { days: "{{days}}" });

  // "en" edits the base copy (labels / reasonField); any other code edits that
  // locale's sparse translation, with the English value shown as a placeholder.
  const isBase = activeLocale === BASE_LOCALE;
  const translation = settings.translations?.[activeLocale] ?? {};
  const tLabels = translation.labels ?? {};
  const tReasonOptions = translation.reasonOptions ?? [];

  // Every supported language, English first — settings.languages is always
  // the full AVAILABLE_LANGUAGES list now (see resolveFormSettings), so this
  // is really just "English, then everything else" in a stable order.
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
          <s-heading>{t("formSetup.content.heading")}</s-heading>
          <s-stack direction="inline" gap="small-200">
            {FORM_TABS.map((tab) => (
              <s-button
                key={tab}
                variant={activeTab === tab ? "primary" : "secondary"}
                onClick={() => onTabChange(tab)}
              >
                {t(`formSetup.content.tabs.${tab}`)}
              </s-button>
            ))}
          </s-stack>
        </s-stack>

        {/* Every supported language is available here directly — no separate
            "offer this language" step. Switching the dropdown retargets every
            field below at that language's translation; English is always the
            base and always selected by default. */}
        <s-select
          label={t("formSetup.content.language")}
          details={t("formSetup.content.languageDetails")}
          value={activeLocale}
          onChange={(event) =>
            onLocaleChange(/** @type {HTMLSelectElement} */ (event.currentTarget).value)
          }
        >
          {localeTabs.map((code) => (
            <s-option key={code} value={code}>
              {languageName(code)}
            </s-option>
          ))}
        </s-select>

        {activeTab === "step1" && (
          <s-stack direction="block" gap="base">
            <s-stack direction="block" gap="small-500">
              <s-heading>{t("formSetup.content.beforeDelivery.heading")}</s-heading>
              <s-text color="subdued">{t("formSetup.content.beforeDelivery.description")}</s-text>
            </s-stack>
            <s-stack gap="small-200">
              <s-text-field label={t("formSetup.content.title")} {...labelField("step1Title")}></s-text-field>
              <s-text-area
                label={t("formSetup.content.description")}
                rows={2}
                details={daysHint}
                {...labelField("step1Description")}
              ></s-text-area>
              <s-text-field
                label={t("formSetup.content.itemHeading")}
                {...labelField("itemSelectionHeading")}
              ></s-text-field>
            </s-stack>
            <s-divider></s-divider>
            <s-stack direction="block" gap="small-500">
              <s-heading>{t("formSetup.content.afterDelivery.heading")}</s-heading>
              <s-text color="subdued">{t("formSetup.content.afterDelivery.description")}</s-text>
            </s-stack>
            <s-stack gap="small-200">
              <s-text-field label={t("formSetup.content.title")} {...labelField("deliveredTitle")}></s-text-field>
              <s-text-area
                label={t("formSetup.content.description")}
                rows={2}
                details={daysHint}
                {...labelField("deliveredDescription")}
              ></s-text-area>
              <s-text-field
                label={t("formSetup.content.itemHeading")}
                {...labelField("deliveredItemSelectionHeading")}
              ></s-text-field>
            </s-stack>

            {isBase && (
              <>
                <s-divider></s-divider>
                <s-stack direction="block" gap="small-500">
                  <s-heading>{t("formSetup.content.customerDetails.heading")}</s-heading>
                  <s-text color="subdued">{t("formSetup.content.customerDetails.description")}</s-text>
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
                          <s-text>{t(`formSetup.content.customerDetails.${field}`)}</s-text>
                          <s-badge>{t("formSetup.content.customerDetails.locked")}</s-badge>
                        </s-stack>
                      </s-stack>
                    ))}
                  </s-stack>
                </s-box>
              </>
            )}

            <s-divider></s-divider>
            <s-stack gap="small-200">
              <s-heading>{t("formSetup.content.reason.heading")}</s-heading>
              {isBase && (
                <s-checkbox
                  label={t("formSetup.content.reason.checkbox")}
                  details={t("formSetup.content.reason.details")}
                  checked={settings.reasonField.enabled}
                  onChange={(e) => update("reasonField.enabled", e.currentTarget.checked)}
                ></s-checkbox>
              )}

              {settings.reasonField.enabled &&
                (isBase ? (
                  <s-stack direction="block" gap="base">
                    <s-text-field
                      label={t("formSetup.content.reason.label")}
                      value={settings.reasonField.label}
                      error={errors["reasonField.label"]}
                      onInput={(e) => update("reasonField.label", e.currentTarget.value)}
                      onFocus={() => dismissError("reasonField.label")}
                    ></s-text-field>

                    <s-stack direction="block" gap="small-200">
                      <s-text type="strong">{t("formSetup.content.reason.optionsHeading")}</s-text>
                      <s-text color="subdued">{t("formSetup.content.reason.optionsHelp")}</s-text>
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
                                    accessibilityLabel={t("formSetup.content.reason.removeOption", { option })}
                                    onClick={() => removeReason(index)}
                                  >
                                    {t("common.remove")}
                                  </s-button>
                                </s-stack>
                              </s-stack>
                            ))}
                          </s-stack>
                        </s-box>
                      )}

                      <s-grid gridTemplateColumns="1fr auto" gap="small-200" alignItems="start">
                        <s-text-field
                          label={t("formSetup.content.reason.addLabel")}
                          labelAccessibilityVisibility="exclusive"
                          placeholder={t("formSetup.content.reason.addPlaceholder")}
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
                          {t("common.add")}
                        </s-button>
                      </s-grid>
                    </s-stack>
                  </s-stack>
                ) : (
                  <s-stack direction="block" gap="base">
                    <s-text-field
                      label={t("formSetup.content.reason.label")}
                      value={translation.reasonLabel ?? ""}
                      placeholder={settings.reasonField.label}
                      error={errors[`translations.${activeLocale}.reasonLabel`]}
                      onFocus={() => dismissError(`translations.${activeLocale}.reasonLabel`)}
                      onInput={(e) =>
                        update(`translations.${activeLocale}.reasonLabel`, e.currentTarget.value)
                      }
                    ></s-text-field>

                    <s-stack direction="block" gap="small-200">
                      <s-text type="strong">{t("formSetup.content.reason.optionsHeading")}</s-text>
                      <s-text color="subdued">{t("formSetup.content.reason.translatedHelp")}</s-text>
                      {options.length === 0 ? (
                        <s-text color="subdued">{t("formSetup.content.reason.translatedEmpty")}</s-text>
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
              label={t("formSetup.content.continueButton")}
              {...labelField("step1ButtonLabel")}
            ></s-text-field>
          </s-stack>
        )}

        {activeTab === "confirm" && (
          <s-stack direction="block" gap="small-200">
            <s-text-field
              label={t("formSetup.content.confirm.heading")}
              {...labelField("confirmHeading")}
            ></s-text-field>
            <s-text-area
              label={t("formSetup.content.confirm.messageBefore")}
              rows={3}
              {...labelField("confirmMessage")}
            ></s-text-area>
            <s-text-area
              label={t("formSetup.content.confirm.messageAfter")}
              rows={3}
              {...labelField("deliveredConfirmMessage")}
            ></s-text-area>
            <s-text-area
              label={t("formSetup.content.confirm.declaration")}
              rows={2}
              {...labelField("declaration")}
            ></s-text-area>
            <s-text-field
              label={t("formSetup.content.confirm.button")}
              {...labelField("confirmButtonLabel")}
            ></s-text-field>
          </s-stack>
        )}

        {activeTab === "done" && (
          <s-stack direction="block" gap="small-200">
            <s-text-field
              label={t("formSetup.content.done.titleBefore")}
              {...labelField("submittedTitle")}
            ></s-text-field>
            <s-text-area
              label={t("formSetup.content.done.messageBefore")}
              rows={2}
              {...labelField("submittedMessage")}
            ></s-text-area>
            <s-text-field
              label={t("formSetup.content.done.titleAfter")}
              {...labelField("deliveredSubmittedTitle")}
            ></s-text-field>
            <s-text-area
              label={t("formSetup.content.done.messageAfter")}
              rows={2}
              {...labelField("deliveredSubmittedMessage")}
            ></s-text-area>
          </s-stack>
        )}
      </s-stack>
    </s-section>
  );
}
