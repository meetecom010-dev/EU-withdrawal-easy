// UI constants for the Email Templates route. The template metadata and default
// bodies live in the code registry (app/services/email/registry.js) — the
// single source of truth — so this file only re-exports the list/meta and adds
// the route-only bits.

import { TEMPLATE_LIST } from "../../services/email/registry";

// Subjects over this read as truncated in most inboxes — a soft cap the UI and
// server both enforce.
export const SUBJECT_MAX = 150;

export { TEMPLATE_LIST };

// key -> metadata, for quick lookups in the editor.
export const TEMPLATE_META = Object.fromEntries(TEMPLATE_LIST.map((meta) => [meta.key, meta]));
