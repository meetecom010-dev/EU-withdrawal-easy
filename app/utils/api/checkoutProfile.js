import { apiFetch } from "./client";

// Frontend call for the /api/checkout-profile endpoint (app/routes/api/checkout-profile.jsx).
export function getCheckoutProfile() {
  return apiFetch("/checkout-profile");
}
