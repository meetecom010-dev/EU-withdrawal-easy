// Central validation for the form-setup settings object. Returns a flat map
// of dot-path -> message descriptor ({ key, values }, see i18n/errors.js) for
// every field currently invalid; an empty object means the settings are safe
// to save. Descriptors rather than strings so each side translates them for
// its own locale. Shared by the client
// (route.jsx, to block Save and show inline errors on the relevant field)
// and the server (services/app-settings.server.js, so the API can't be used
// to bypass it).
//
// The keys are the same dot-paths the UI writes through `update()`, which is
// what lets a field find its own message and dismiss it when the merchant
// returns to that field.

import { message } from "../../i18n/errors";
import { AFTER_DELIVERY_ACTIONS, BASE_LOCALE, FALLBACK_OPTIONS } from "./constants";

const FALLBACK_DAYS_RANGE = { min: 1, max: 90 };
const DEADLINE_DAYS_RANGE = { min: 1, max: 365 };
const TRANSIT_DAYS_RANGE = { min: 0, max: 90 };

const FALLBACK_VALUES = FALLBACK_OPTIONS.map((option) => option.value);

// Every label is customer-facing copy the order status extension renders
// verbatim, so a blank one ships a heading with no words or a button with no
// text to the shopper. All of them are required, and each message names what
// the field is for — the two "Title" fields only differ by which step they
// belong to. Values are formSetup.validation.* translation keys.
const REQUIRED_LABELS = {
  step1Title: "formSetup.validation.title",
  step1Description: "formSetup.validation.description",
  itemSelectionHeading: "formSetup.validation.itemHeading",
  deliveredTitle: "formSetup.validation.title",
  deliveredDescription: "formSetup.validation.description",
  deliveredItemSelectionHeading: "formSetup.validation.itemHeading",
  step1ButtonLabel: "formSetup.validation.continueButton",
  confirmHeading: "formSetup.validation.heading",
  confirmMessage: "formSetup.validation.confirmMessage",
  deliveredConfirmMessage: "formSetup.validation.confirmMessage",
  declaration: "formSetup.validation.declaration",
  confirmButtonLabel: "formSetup.validation.confirmButton",
  submittedTitle: "formSetup.validation.title",
  submittedMessage: "formSetup.validation.message",
  deliveredSubmittedTitle: "formSetup.validation.title",
  deliveredSubmittedMessage: "formSetup.validation.message",
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
    errors.countryMode = message("formSetup.validation.countryMode");
  } else if (settings.countryMode === "specific" && (settings.euCountries ?? []).length === 0) {
    errors.euCountries = message("formSetup.validation.euCountries");
  }

  for (const [key, messageKey] of Object.entries(REQUIRED_LABELS)) {
    if (isBlank(labels[key])) {
      errors[`labels.${key}`] = message(messageKey);
    }
  }

  if (reasonField.enabled) {
    if (isBlank(reasonField.label)) {
      errors["reasonField.label"] = message("formSetup.validation.reasonLabel");
    }
    if ((reasonField.options ?? []).length === 0) {
      errors["reasonField.options"] = message("formSetup.validation.reasonOptions");
    }
  }

  // Every offered language is held to the same standard as English: no blank
  // labels, and (when the reason field is on) a translated reason label and one
  // translation per English option. Blanks are prevented in practice by the
  // default-copy prefill (translations.js), so this only bites if a merchant
  // clears a field or adds a custom English option they haven't translated yet.
  const languages = settings.languages ?? [BASE_LOCALE];
  const translations = settings.translations ?? {};
  for (const lang of languages) {
    if (lang === BASE_LOCALE) continue;
    const t = translations[lang] ?? {};
    const tLabels = t.labels ?? {};
    for (const [key, messageKey] of Object.entries(REQUIRED_LABELS)) {
      if (isBlank(tLabels[key])) {
        errors[`translations.${lang}.labels.${key}`] = message(messageKey);
      }
    }
    if (reasonField.enabled) {
      if (isBlank(t.reasonLabel)) {
        errors[`translations.${lang}.reasonLabel`] = message("formSetup.validation.reasonLabel");
      }
      const tOptions = t.reasonOptions ?? [];
      (reasonField.options ?? []).forEach((_, index) => {
        if (isBlank(tOptions[index])) {
          errors[`translations.${lang}.reasonOptions.${index}`] = message("formSetup.validation.reasonOptionTranslation");
        }
      });
    }
  }

  if (automation.holdFulfillment) {
    if (!FALLBACK_VALUES.includes(automation.unshippedFallback)) {
      errors["automation.unshippedFallback"] = message("formSetup.validation.fallback");
    } else if (
      (automation.unshippedFallback === "release-n" ||
        automation.unshippedFallback === "cancel-n") &&
      !isValidNumber(automation.unshippedFallbackDays, FALLBACK_DAYS_RANGE)
    ) {
      errors["automation.unshippedFallbackDays"] = message("formSetup.validation.daysRange", FALLBACK_DAYS_RANGE);
    }
  }

  if (automation.tagBeforeShip && (automation.beforeShipTags ?? []).length === 0) {
    errors["automation.beforeShipTags"] = message("formSetup.validation.tags");
  }

  if (!AFTER_DELIVERY_ACTIONS.includes(automation.afterDeliveryAction)) {
    errors["automation.afterDeliveryAction"] = message("formSetup.validation.afterDeliveryAction");
  }

  if (automation.tagAfterDelivery && (automation.afterDeliveryTags ?? []).length === 0) {
    errors["automation.afterDeliveryTags"] = message("formSetup.validation.tags");
  }

  if (!isValidNumber(deadline.daysAfterDelivery, DEADLINE_DAYS_RANGE)) {
    errors["deadline.daysAfterDelivery"] = message("formSetup.validation.daysRange", DEADLINE_DAYS_RANGE);
  }

  if (!isValidNumber(deadline.estimatedTransitDays, TRANSIT_DAYS_RANGE)) {
    errors["deadline.estimatedTransitDays"] = message("formSetup.validation.daysRange", TRANSIT_DAYS_RANGE);
  }

  return errors;
}
