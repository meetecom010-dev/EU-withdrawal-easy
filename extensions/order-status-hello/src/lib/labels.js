// The merchant writes two sets of copy in Form Setup: one for an order the
// customer hasn't received yet, and one for an order that's arrived. The step
// components only ever read the base key names, so switching sets happens here
// in one place rather than through an `isDelivered` check at every call site.
//
// Only six labels have a delivered variant. Everything else (the confirmation
// heading, the declaration, both button labels) is shared by design — there's
// no delivered counterpart for them in the settings schema, so they must not
// be remapped.
const DELIVERED_OVERRIDES = {
  step1Title: "deliveredTitle",
  step1Description: "deliveredDescription",
  itemSelectionHeading: "deliveredItemSelectionHeading",
  confirmMessage: "deliveredConfirmMessage",
  submittedTitle: "deliveredSubmittedTitle",
  submittedMessage: "deliveredSubmittedMessage",
};

/**
 * @param {Record<string, string>} labels the full label set from the backend
 * @param {"before_delivery" | "delivered"} stage
 */
export function resolveLabels(labels, stage) {
  if (stage !== "delivered" || !labels) return labels;

  const resolved = { ...labels };
  for (const [baseKey, deliveredKey] of Object.entries(DELIVERED_OVERRIDES)) {
    const value = labels[deliveredKey];
    // Falls back to the base label when a delivered variant is somehow blank.
    // Form Setup requires all of them, but a settings document saved before
    // that validation existed can still be missing one, and an empty heading
    // on the customer's screen is worse than the pre-delivery wording.
    if (typeof value === "string" && value.trim() !== "") {
      resolved[baseKey] = value;
    }
  }
  return resolved;
}
