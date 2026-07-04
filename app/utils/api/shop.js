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
