/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FALLBACK_OPTIONS } from "../constants";
import { toNumberValue } from "../fieldValue";

function FallbackControl({
  value,
  onChange,
  error,
  onDismissError,
  days,
  onDaysChange,
  daysError,
  onDismissDaysError,
}) {
  const { t } = useTranslation();
  const showDays = value === "release-n" || value === "cancel-n";
  return (
    <s-stack direction="block" gap="base">
      <s-select
        label={t("formSetup.automation.fallback.label")}
        value={value}
        error={error}
        onChange={(e) => onChange(e.currentTarget.value)}
        onFocus={onDismissError}
      >
        {FALLBACK_OPTIONS.map((option) => (
          <s-option key={option.value} value={option.value}>
            {t(`formSetup.automation.fallback.${option.labelKey}`)}
          </s-option>
        ))}
      </s-select>
      {showDays && (
        <s-number-field
          label={t("formSetup.automation.fallback.days")}
          value={String(days)}
          min={1}
          max={90}
          error={daysError}
          onInput={(e) => onDaysChange(toNumberValue(e.currentTarget.value))}
          onFocus={onDismissDaysError}
        ></s-number-field>
      )}
    </s-stack>
  );
}

function TagInput({ tags = [], onChange, error, onDismissError }) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");

  const addTag = () => {
    const tag = value.trim();

    if (!tag) return;

    // Prevent duplicates
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setValue("");
      return;
    }

    onChange([...tags, tag]);
    setValue("");
  };

  const removeTag = (tag) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <s-stack direction="block" gap="small-200">
      <s-text type="strong">{t("formSetup.automation.tag.label")}</s-text>

      <s-text-field
        label={t("formSetup.automation.tag.label")}
        labelAccessibilityVisibility="exclusive"
        placeholder={t("formSetup.automation.tag.placeholder")}
        value={value}
        // "Add at least one tag" belongs to the tag list, and this composer is
        // the control that fixes it.
        error={error}
        onFocus={onDismissError}
        onInput={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
          }

          // Optional: remove last tag with Backspace
          if (
            e.key === "Backspace" &&
            value === "" &&
            tags.length > 0
          ) {
            removeTag(tags[tags.length - 1]);
          }
        }}
        onBlur={addTag}
      />

      {tags.length > 0 && (
        <s-stack direction="inline" gap="small-200">
          {tags.map((tag) => (
            <s-clickable-chip
              key={tag}
              removable
              onRemove={() => removeTag(tag)}
            >
              {tag}
            </s-clickable-chip>
          ))}
        </s-stack>
      )}
    </s-stack>
  );
}

// The "Tag the order" toggle + tag input is identical before-ship
// and after-delivery, differing only in which settings path they read/write.
function TagOnSubmission({
  description,
  checked,
  onToggle,
  tags,
  onTagsChange,
  error,
  onDismissError,
}) {
  const { t } = useTranslation();
  return (
    <>
      <s-checkbox
        label={t("formSetup.automation.tag.checkbox")}
        details={description}
        checked={checked}
        onChange={onToggle}
      ></s-checkbox>
      {checked && (
        <TagInput
          tags={tags ?? []}
          onChange={onTagsChange}
          error={error}
          onDismissError={onDismissError}
        />
      )}
    </>
  );
}

export default function AutomationCard({ settings, update, errors = {}, dismissError }) {
  const { t } = useTranslation();

  return (
    <s-section heading={t("formSetup.automation.heading")}>
      <s-stack direction="block" gap="base">
        <s-paragraph color="subdued">{t("formSetup.automation.description")}</s-paragraph>
        <s-stack gap="small-200">
          <s-heading>{t("formSetup.automation.beforeShip.heading")}</s-heading>
          <s-checkbox
            label={t("formSetup.automation.beforeShip.hold")}
            details={t("formSetup.automation.beforeShip.holdDetails")}
            checked={settings.automation.holdFulfillment}
            onChange={(e) => update("automation.holdFulfillment", e.currentTarget.checked)}
          ></s-checkbox>
          {settings.automation.holdFulfillment && (
            <FallbackControl
              value={settings.automation.unshippedFallback}
              onChange={(value) => update("automation.unshippedFallback", value)}
              error={errors["automation.unshippedFallback"]}
              onDismissError={() => dismissError("automation.unshippedFallback")}
              days={settings.automation.unshippedFallbackDays}
              onDaysChange={(days) => update("automation.unshippedFallbackDays", days)}
              daysError={errors["automation.unshippedFallbackDays"]}
              onDismissDaysError={() => dismissError("automation.unshippedFallbackDays")}
            />
          )}
          <TagOnSubmission
            description={t("formSetup.automation.beforeShip.tagDetails")}
            checked={settings.automation.tagBeforeShip}
            onToggle={(e) => update("automation.tagBeforeShip", e.currentTarget.checked)}
            tags={settings.automation.beforeShipTags}
            onTagsChange={(tags) => update("automation.beforeShipTags", tags)}
            error={errors["automation.beforeShipTags"]}
            onDismissError={() => dismissError("automation.beforeShipTags")}
          />
        </s-stack>

        <s-divider></s-divider>
        <s-stack gap="small-200">
          <s-stack direction="block" gap="small-500">
            <s-heading>{t("formSetup.automation.afterDelivery.heading")}</s-heading>
            <s-text color="subdued">{t("formSetup.automation.afterDelivery.description")}</s-text>
          </s-stack>

          {/* Still stored as "create_return" / "notify_only" — the automation and the
              request history read those values. Unchecked is "notify_only", which is
              just the absence of a return: the merchant email goes out regardless. */}
          <s-checkbox
            label={t("formSetup.automation.afterDelivery.createReturn")}
            details={t("formSetup.automation.afterDelivery.createReturnDetails")}
            checked={settings.automation.afterDeliveryAction === "create_return"}
            error={errors["automation.afterDeliveryAction"]}
            onChange={(e) =>
              update(
                "automation.afterDeliveryAction",
                e.currentTarget.checked ? "create_return" : "notify_only",
              )
            }
          ></s-checkbox>

          <TagOnSubmission
            description={t("formSetup.automation.afterDelivery.tagDetails")}
            checked={settings.automation.tagAfterDelivery}
            onToggle={(e) => update("automation.tagAfterDelivery", e.currentTarget.checked)}
            tags={settings.automation.afterDeliveryTags}
            onTagsChange={(tags) => update("automation.afterDeliveryTags", tags)}
            error={errors["automation.afterDeliveryTags"]}
            onDismissError={() => dismissError("automation.afterDeliveryTags")}
          />
        </s-stack>

      </s-stack>
    </s-section>
  );
}
