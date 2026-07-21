/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";

const FALLBACK_OPTIONS = [
  { value: "hold", label: "Do nothing — hold until staff act" },
  { value: "cancel-now", label: "Cancel and refund immediately" },
  { value: "release-n", label: "Release the hold after N days" },
  { value: "cancel-n", label: "Cancel and refund after N days" },
];

function FallbackControl({ value, onChange, days, onDaysChange, daysError }) {
  const showDays = value === "release-n" || value === "cancel-n";
  return (
    <s-stack direction="block" gap="base">
      <s-select
        label="If no one reviews the request in time"
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
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
          onChange={(e) => onDaysChange(Number(e.currentTarget.value))}
        ></s-number-field>
      )}
    </s-stack>
  );
}

function TagInput({ tags = [], onChange }) {
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
function TagOnSubmission({ description, checked, onToggle, tags, onTagsChange, error }) {
  return (
    <>
      <s-checkbox
        label="Add tag on submission"
        details={description}
        checked={checked}
        onChange={onToggle}
      ></s-checkbox>
      {checked && (
        <s-stack direction="block" gap="small-200">
          <TagInput tags={tags ?? []} onChange={onTagsChange} />
          {error && <s-text tone="critical">{error}</s-text>}
        </s-stack>
      )}
    </>
  );
}

export default function AutomationCard({ settings, update, errors = {} }) {
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
              days={settings.automation.unshippedFallbackDays}
              onDaysChange={(days) => update("automation.unshippedFallbackDays", days)}
              daysError={errors["automation.unshippedFallbackDays"]}
            />
          )}
          <TagOnSubmission
            description="Tag the order when a request arrives before it ships, so your team can spot it in the order list."
            checked={settings.automation.tagBeforeShip}
            onToggle={(e) => update("automation.tagBeforeShip", e.currentTarget.checked)}
            tags={settings.automation.beforeShipTags}
            onTagsChange={(tags) => update("automation.beforeShipTags", tags)}
            error={errors["automation.beforeShipTags"]}
          />
        </s-stack>

        <s-divider></s-divider>
        <s-stack gap="small-200">
          <s-stack direction="block" gap="small-500">
            <s-heading>After delivery</s-heading>
            <s-text color="subdued">
              What happens when a request comes in after the goods may already be with the customer.
            </s-text>
          </s-stack>

          <s-choice-list
            label="What happens after delivery"
            labelAccessibilityVisibility="exclusive"
            name="afterDeliveryAction"
            values={[settings.automation.afterDeliveryAction]}
            onChange={(e) => update("automation.afterDeliveryAction", e.currentTarget.values[0])}
          >
            <s-choice value="notify_only">
              Notify only
              <s-text slot="details">
                Email your team so they can review and handle the request manually.
              </s-text>
            </s-choice>
            <s-choice value="create_return">
              Create return
              <s-text slot="details">
                Automatically create a Shopify return for the selected items.
              </s-text>
            </s-choice>
          </s-choice-list>

          <TagOnSubmission
            description="Tag the order when a request arrives after delivery."
            checked={settings.automation.tagAfterDelivery}
            onToggle={(e) => update("automation.tagAfterDelivery", e.currentTarget.checked)}
            tags={settings.automation.afterDeliveryTags}
            onTagsChange={(tags) => update("automation.afterDeliveryTags", tags)}
            error={errors["automation.afterDeliveryTags"]}
          />
        </s-stack>

      </s-stack>
    </s-section>
  );
}
