// Helpers for wiring Polaris form components to the settings state.
//
// Polaris web components emit two value events: `input` on every keystroke,
// and `change` only when the field commits — which, for text-style inputs,
// means blur or Enter. Binding a text input to `change` therefore leaves the
// contextual save bar hidden while the merchant is still typing, so every
// editable field on this page binds `input` instead. Discrete controls
// (checkbox, select, choice list) commit immediately, so they stay on
// `change`.

// Number fields hand back a raw string. Keeping the string whenever it isn't a
// finite number lets the merchant clear the field and retype — coercing with
// Number() alone turns "" into 0, which snaps a "0" back into the field
// mid-edit. validateFormSettings only accepts real numbers, so a half-typed
// value blocks Save and shows the field's inline error rather than being saved.
export function toNumberValue(raw) {
  if (raw.trim() === "") return "";
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : raw;
}

// Serialises a settings object for the dirty-state comparison, with every
// string trimmed first: leading and trailing whitespace isn't a content
// change, so on its own it shouldn't raise the save bar. This normalises the
// comparison only — what gets saved is still exactly what the merchant typed.
export function dirtyFingerprint(settings) {
  return JSON.stringify(trimStrings(settings));
}

function trimStrings(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(trimStrings);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, trimStrings(nested)]),
    );
  }
  return value;
}
