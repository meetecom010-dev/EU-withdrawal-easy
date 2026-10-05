import { apiFetch } from "./client";

// Frontend call for the /api/form-settings endpoint (app/routes/api/form-settings.jsx).
// GET is handled by the route loaders now (see routes/_app._index, _app.form-setup,
// _app.jsx) — this file only still needs the write side.
export function saveFormSettings(formSettings) {
  return apiFetch("/form-settings", { method: "PUT", body: formSettings });
}
