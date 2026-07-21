// Central validation for the form-setup settings object. Returns a flat map
// of dot-path -> error message for every field currently invalid; an empty
// object means the settings are safe to save. Shared by the client
// (route.jsx, to block Save and show inline errors on the relevant field)
// and the server (services/app-settings.server.js, so the API can't be used
// to bypass it).

const FALLBACK_DAYS_RANGE = { min: 1, max: 90 };
const DEADLINE_DAYS_RANGE = { min: 1, max: 365 };
const TRANSIT_DAYS_RANGE = { min: 0, max: 90 };

function isValidNumber(value, { min = -Infinity, max = Infinity } = {}) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function validateFormSettings(settings) {
  const errors = {};
  const automation = settings.automation ?? {};
  const deadline = settings.deadline ?? {};
  const reasonField = settings.reasonField ?? {};

  if (settings.countryMode !== "all" && settings.countryMode !== "specific") {
    errors.countryMode = "Choose which countries are eligible.";
  } else if (settings.countryMode === "specific" && (settings.euCountries ?? []).length === 0) {
    errors.euCountries = "Select at least one country.";
  }

  if (automation.tagBeforeShip && (automation.beforeShipTags ?? []).length === 0) {
    errors["automation.beforeShipTags"] = "Add at least one tag, or turn off tagging.";
  }

  if (automation.tagAfterDelivery && (automation.afterDeliveryTags ?? []).length === 0) {
    errors["automation.afterDeliveryTags"] = "Add at least one tag, or turn off tagging.";
  }

  if (
    automation.holdFulfillment &&
    (automation.unshippedFallback === "release-n" || automation.unshippedFallback === "cancel-n") &&
    !isValidNumber(automation.unshippedFallbackDays, FALLBACK_DAYS_RANGE)
  ) {
    errors["automation.unshippedFallbackDays"] =
      `Enter a number of days between ${FALLBACK_DAYS_RANGE.min} and ${FALLBACK_DAYS_RANGE.max}.`;
  }

  if (reasonField.enabled) {
    if (!reasonField.label || !reasonField.label.trim()) {
      errors["reasonField.label"] = "Enter a label for the reason field.";
    }
    if ((reasonField.options ?? []).length === 0) {
      errors["reasonField.options"] = "Add at least one reason option.";
    }
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
