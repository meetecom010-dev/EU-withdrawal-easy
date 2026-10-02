import { apiFetch } from "./client";

// Frontend calls for the /api/shop endpoint (app/routes/api/shop.jsx).
export function updateShopPlan(plan) {
  return apiFetch("/shop", { method: "PUT", body: plan });
}

export function updateOnboardingStatus({ onboardingCompleted }) {
  return apiFetch("/shop", {
    method: "PUT",
    body: { onboardingCompleted },
  });
}

export function updateOrderStatusBlockStatus(orderStatusBlockAdded) {
  return apiFetch("/shop", {
    method: "PATCH",
    body: { orderStatusBlockAdded },
  });
}

export function updateThemeBlockAdded(themeBlockAdded) {
  return apiFetch("/shop", {
    method: "PATCH",
    body: { themeBlockAdded },
  });
}
