// Central validation for the form-setup settings object. Returns a flat map
// of dot-path -> error message for every field currently invalid; an empty
// object means the settings are safe to save. Shared by the client
// (route.jsx, to block Save and show inline errors on the relevant field)
// and the server (services/app-settings.server.js, so the API can't be used
// to bypass it).
//
// The keys are the same dot-paths the UI writes through `update()`, which is
// what lets a field find its own message and dismiss it when the merchant
// returns to that field.

import { AFTER_DELIVERY_ACTIONS, FALLBACK_OPTIONS } from "./constants";

const FALLBACK_DAYS_RANGE = { min: 1, max: 90 };
const DEADLINE_DAYS_RANGE = { min: 1, max: 365 };
const TRANSIT_DAYS_RANGE = { min: 0, max: 90 };

const FALLBACK_VALUES = FALLBACK_OPTIONS.map((option) => option.value);

// Every label is customer-facing copy the order status extension renders
// verbatim, so a blank one ships a heading with no words or a button with no
// text to the shopper. All of them are required, and each message names what
// the field is for — the two "Title" fields only differ by which step they
// belong to.
const REQUIRED_LABELS = {
  step1Title: "Enter a title.",
  step1Description: "Enter a description.",
  itemSelectionHeading: "Enter a heading for the item list.",
  deliveredTitle: "Enter a title.",
  deliveredDescription: "Enter a description.",
  deliveredItemSelectionHeading: "Enter a heading for the item list.",
  step1ButtonLabel: "Enter a label for the continue button.",
  confirmHeading: "Enter a heading.",
  confirmMessage: "Enter a confirmation message.",
  deliveredConfirmMessage: "Enter a confirmation message.",
  declaration: "Enter the declaration customers have to accept.",
  confirmButtonLabel: "Enter a label for the confirm button.",
  submittedTitle: "Enter a title.",
  submittedMessage: "Enter a message.",
  deliveredSubmittedTitle: "Enter a title.",
  deliveredSubmittedMessage: "Enter a message.",
};

function isValidNumber(value, { min = -Infinity, max = Infinity } = {}) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isBlank(value) {
  return typeof value !== "string" || value.trim() === "";
}

export function validateFormSettings(settings) {
  const errors = {};
  const labels = settings.labels ?? {};
  const automation = settings.automation ?? {};
  const deadline = settings.deadline ?? {};
  const reasonField = settings.reasonField ?? {};

  // Ordered to follow the page top to bottom, so the first error is also the
  // highest one on screen.
  if (settings.countryMode !== "all" && settings.countryMode !== "specific") {
    errors.countryMode = "Choose which countries are eligible.";
  } else if (settings.countryMode === "specific" && (settings.euCountries ?? []).length === 0) {
    errors.euCountries = "Select at least one country.";
  }

  for (const [key, message] of Object.entries(REQUIRED_LABELS)) {
    if (isBlank(labels[key])) {
      errors[`labels.${key}`] = message;
    }
  }

  if (reasonField.enabled) {
    if (isBlank(reasonField.label)) {
      errors["reasonField.label"] = "Enter a label for the reason field.";
    }
    if ((reasonField.options ?? []).length === 0) {
      errors["reasonField.options"] = "Add at least one reason option.";
    }
  }

  if (automation.holdFulfillment) {
    if (!FALLBACK_VALUES.includes(automation.unshippedFallback)) {
      errors["automation.unshippedFallback"] =
        "Choose what happens if no one reviews the request in time.";
    } else if (
      (automation.unshippedFallback === "release-n" ||
        automation.unshippedFallback === "cancel-n") &&
      !isValidNumber(automation.unshippedFallbackDays, FALLBACK_DAYS_RANGE)
    ) {
      errors["automation.unshippedFallbackDays"] =
        `Enter a number of days between ${FALLBACK_DAYS_RANGE.min} and ${FALLBACK_DAYS_RANGE.max}.`;
    }
  }

  if (automation.tagBeforeShip && (automation.beforeShipTags ?? []).length === 0) {
    errors["automation.beforeShipTags"] = "Add at least one tag, or turn off tagging.";
  }

  if (!AFTER_DELIVERY_ACTIONS.includes(automation.afterDeliveryAction)) {
    errors["automation.afterDeliveryAction"] = "Choose what happens after delivery.";
  }

  if (automation.tagAfterDelivery && (automation.afterDeliveryTags ?? []).length === 0) {
    errors["automation.afterDeliveryTags"] = "Add at least one tag, or turn off tagging.";
  }

  if (!isValidNumber(deadline.daysAfterDelivery, DEADLINE_DAYS_RANGE)) {
    errors["deadline.daysAfterDelivery"] =
      `Enter a number of days between ${DEADLINE_DAYS_RANGE.min} and ${DEADLINE_DAYS_RANGE.max}.`;
  }

  if (!isValidNumber(deadline.estimatedTransitDays, TRANSIT_DAYS_RANGE)) {
    errors["deadline.estimatedTransitDays"] =
      `Enter a number of days between ${TRANSIT_DAYS_RANGE.min} and ${TRANSIT_DAYS_RANGE.max}.`;
  }

  return errors;
}
