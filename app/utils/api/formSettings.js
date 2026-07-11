import { apiFetch } from "./client";

// Frontend calls for the /api/form-settings endpoint (app/routes/api/form-settings.jsx).
export function getFormSettings() {
  return apiFetch("/form-settings");
}

export function saveFormSettings(formSettings) {
  return apiFetch("/form-settings", { method: "PUT", body: formSettings });
}
