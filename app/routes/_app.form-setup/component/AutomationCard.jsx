/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
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
  const showDays = value === "release-n" || value === "cancel-n";
  return (
    <s-stack direction="block" gap="base">
      <s-select
        label="If no one reviews the request in time"
        value={value}
        error={error}
        onChange={(e) => onChange(e.currentTarget.value)}
        onFocus={onDismissError}
      >
        {FALLBACK_OPTIONS.map((option) => (
          <s-option key={option.value} value={option.value}>
            {option.label}
          </s-option>
        ))}
      </s-select>
      {showDays && (
        <s-number-field
          label="Number of days"
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
      <s-text type="strong">Order tags</s-text>

      <s-text-field
        label="Order tags"
        labelAccessibilityVisibility="exclusive"
        placeholder="Add tag"
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

// The "Add tag on submission" toggle + tag input is identical before-ship
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
  return (
    <>
      <s-checkbox
        label="Add tag on submission"
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
  return (
    <s-section heading="Automation">
      <s-stack direction="block" gap="base">
        <s-paragraph color="subdued">
          What happens automatically when a withdrawal request is submitted.
        </s-paragraph>
        <s-stack gap="small-200">
          <s-heading>Before the order ships</s-heading>
          <s-checkbox
            label="Hold order for staff review on submission"
            details="Pause fulfillment until your team reviews the request, before the order ships."
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
            description="Tag the order when a request arrives before it ships, so your team can spot it in the order list."
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
            <s-heading>After delivery</s-heading>
            <s-text color="subdued">
              What happens when a request comes in after the goods may already be with the customer.
              Your team is emailed about every request either way.
            </s-text>
          </s-stack>

          {/* Still stored as "create_return" / "notify_only" — the automation and the
              request history read those values. Unchecked is "notify_only", which is
              just the absence of a return: the merchant email goes out regardless. */}
          <s-checkbox
            label="Create return"
            details="Automatically create a Shopify return for the selected items."
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
            description="Tag the order when a request arrives after delivery."
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
