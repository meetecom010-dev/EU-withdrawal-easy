import { apiFetch } from "./client";

// Frontend calls for the /api/shop endpoint (app/routes/api.shop.jsx).
export function getShop() {
  return apiFetch("/shop");
}

export function updateShopPlan(plan) {
  return apiFetch("/shop", { method: "PUT", body: plan });
}

export function resetShopPlan() {
  return apiFetch("/shop", { method: "DELETE" });
}

export function updateOnboardingStatus({ onboardingCompleted, dpaAccepted }) {
  return apiFetch("/shop", {
    method: "PUT",
    body: { onboardingCompleted, dpaAccepted },
  });
}

export function updateOrderStatusBlockStatus(orderStatusBlockAdded) {
  return apiFetch("/shop", {
    method: "PATCH",
    body: { orderStatusBlockAdded },
  });
}

export function updateDpaAccepted(dpaAccepted) {
  return apiFetch("/shop", {
    method: "PATCH",
    body: { dpaAccepted },
  });
}
