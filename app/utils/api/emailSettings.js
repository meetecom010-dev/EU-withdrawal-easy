import { apiFetch } from "./client";

// Frontend calls for the /api/email-settings endpoint (app/routes/api/email-settings.jsx).
export function getEmailSettings() {
  return apiFetch("/email-settings");
}

export function saveEmailSettings(emailSettings) {
  return apiFetch("/email-settings", { method: "PUT", body: emailSettings });
}

// Custom sender-email verification (app/routes/api/email-sender.jsx).
export function startSenderVerification(email, name) {
  return apiFetch("/email-sender", { method: "POST", body: { intent: "start", email, name } });
}

export function confirmSenderVerification(otp) {
  return apiFetch("/email-sender", { method: "POST", body: { intent: "confirm", otp } });
}

export function refreshSenderStatus() {
  return apiFetch("/email-sender", { method: "POST", body: { intent: "refresh" } });
}

export function removeCustomSender() {
  return apiFetch("/email-sender", { method: "POST", body: { intent: "remove" } });
}

// Domain-level authentication (app/routes/api/email-domain.jsx).
export function startDomainAuth(domain) {
  return apiFetch("/email-domain", { method: "POST", body: { intent: "start", domain } });
}

export function refreshDomainAuth() {
  return apiFetch("/email-domain", { method: "POST", body: { intent: "refresh" } });
}

export function removeDomainAuth() {
  return apiFetch("/email-domain", { method: "POST", body: { intent: "remove" } });
}
