/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import ToggleRow from "./ToggleRow";

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
          label="N days"
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
function TagOnSubmission({ checked, onToggle, tags, onTagsChange, error }) {
  return (
    <>
      <ToggleRow
        title="Add tag on submission"
        description="Add a tag to the order when a withdrawal request is submitted."
        checked={checked}
        onChange={onToggle}
      />
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
    <s-section>
      <s-stack direction="block" gap="base">
        <s-heading>Before the order ships</s-heading>
        <s-text color="subdued">
          What happens when a request is submitted before fulfillment.
        </s-text>

        <ToggleRow
          title="Hold order for staff review on submission"
          description="Pause fulfillment until your team reviews the request, before the order ships."
          checked={settings.automation.holdFulfillment}
          onChange={(e) => update("automation.holdFulfillment", e.currentTarget.checked)}
        />

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
          checked={settings.automation.tagBeforeShip}
          onToggle={(e) => update("automation.tagBeforeShip", e.currentTarget.checked)}
          tags={settings.automation.beforeShipTags}
          onTagsChange={(tags) => update("automation.beforeShipTags", tags)}
          error={errors["automation.beforeShipTags"]}
        />

        <s-divider></s-divider>

        <s-heading>After delivery</s-heading>
        <s-text color="subdued">
          What happens when a request comes in after the goods may already be with the customer.
        </s-text>

        <s-choice-list
          label="What happens after delivery"
          labelAccessibilityVisibility="exclusive"
          name="afterDeliveryAction"
          values={[settings.automation.afterDeliveryAction]}
          onChange={(e) => update("automation.afterDeliveryAction", e.currentTarget.values[0])}
        >
          <s-choice value="notify_only">
            Notify only
            <s-text slot="details">Tag the order and email your team.</s-text>
          </s-choice>
          <s-choice value="create_return">
            Create return
            <s-text slot="details">Create a Shopify return from selected items.</s-text>
          </s-choice>
        </s-choice-list>

        <TagOnSubmission
          checked={settings.automation.tagAfterDelivery}
          onToggle={(e) => update("automation.tagAfterDelivery", e.currentTarget.checked)}
          tags={settings.automation.afterDeliveryTags}
          onTagsChange={(tags) => update("automation.afterDeliveryTags", tags)}
          error={errors["automation.afterDeliveryTags"]}
        />

        <s-divider></s-divider>

        <s-heading>Withdrawal deadline</s-heading>
        <s-text color="subdued">The 14 days run from delivery, not the order date.</s-text>
        <s-grid gridTemplateColumns="1fr 1fr" gap="large-100">
          <s-number-field
            label="Days available after delivery"
            value={String(settings.deadline.daysAfterDelivery)}
            min={1}
            max={365}
            error={errors["deadline.daysAfterDelivery"]}
            onChange={(e) => update("deadline.daysAfterDelivery", Number(e.currentTarget.value))}
          ></s-number-field>
          <s-number-field
            label="Estimated transit days"
            value={String(settings.deadline.estimatedTransitDays)}
            min={0}
            max={90}
            error={errors["deadline.estimatedTransitDays"]}
            onChange={(e) => update("deadline.estimatedTransitDays", Number(e.currentTarget.value))}
          ></s-number-field>
        </s-grid>
      </s-stack>
    </s-section>
  );
}
