// The known form-event types and how they map onto fields in the single
// per-order snapshot document.

export const FORM_EVENT_TYPES = {
  // Pre-submission funnel — emitted by the order-status extension.
  BUTTON_VIEWED: "button_viewed",
  FORM_OPENED: "form_opened",
  // Emitted server-side the moment a request row is created.
  FORM_SUBMITTED: "form_submitted",
};

// Funnel event type -> the events.<field> it updates.
export const FUNNEL_FIELDS = {
  [FORM_EVENT_TYPES.BUTTON_VIEWED]: "buttonViewed",
  [FORM_EVENT_TYPES.FORM_OPENED]: "formOpened",
  [FORM_EVENT_TYPES.FORM_SUBMITTED]: "formSubmitted",
};

// The only types the public endpoint accepts from the storefront. Everything
// else is written server-side; letting a browser post arbitrary types would
// let anyone forge a "returnCreated" or "automation completed" state.
export const PUBLIC_FORM_EVENT_TYPES = new Set([
  FORM_EVENT_TYPES.BUTTON_VIEWED,
  FORM_EVENT_TYPES.FORM_OPENED,
]);
