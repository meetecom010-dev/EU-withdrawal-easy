import { apiFetch } from "./client";

// Frontend call for the /api/dashboard-stats endpoint (app/routes/api/dashboard-stats.jsx).
export function getDashboardStats() {
  return apiFetch("/dashboard-stats");
}
