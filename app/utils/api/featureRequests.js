import { apiFetch } from "./client";

// Frontend call for the /api/feature-requests endpoint (app/routes/api/feature-requests.jsx).
export function submitFeatureRequest(payload) {
  return apiFetch("/feature-requests", { method: "POST", body: payload });
}
