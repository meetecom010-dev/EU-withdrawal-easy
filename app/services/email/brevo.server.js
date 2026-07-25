// Brevo (Sendinblue) transactional email transport. The single place that
// talks to the Brevo HTTP API — every other email module builds content and
// hands it here, so swapping providers later means rewriting only this file.
//
// The `.server.js` suffix keeps this out of any client bundle and, per
// .eslintrc, runs it under the node env so process.env is available without a
// per-line disable. It's the project's convention for server-only modules.

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

// Thrown when Brevo rejects a send. Carries the HTTP status and Brevo's own
// error code/message so a failure is easy to identify in logs, and the caller
// can record a meaningful reason rather than a generic "email failed".
export class BrevoError extends Error {
  constructor(message, { status = null, code = null } = {}) {
    super(message);
    this.name = "BrevoError";
    this.status = status;
    this.code = code;
  }
}

// Resolved once per send rather than at module load, so a key added to the
// environment after boot is picked up without a restart. Returns null when the
// integration isn't configured — callers treat that as "skip", never "fail".
export function brevoConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "EU Withdrawly";
  if (!apiKey || !senderEmail) return null;
  return { apiKey, sender: { email: senderEmail, name: senderName } };
}

export function isEmailConfigured() {
  return brevoConfig() !== null;
}

/**
 * Sends one transactional email through Brevo.
 *
 * @param {{
 *   to: { email: string, name?: string },
 *   subject: string,
 *   htmlContent: string,
 *   replyTo?: { email: string, name?: string },
 *   senderName?: string,
 *   senderEmail?: string,
 *   tags?: string[],
 * }} message
 * @returns {Promise<{ messageId: string | null }>}
 * @throws {BrevoError} when not configured, no recipient, or Brevo rejects it
 */
export async function sendTransactionalEmail({ to, subject, htmlContent, replyTo, senderName, senderEmail, tags }) {
  const config = brevoConfig();
  if (!config) {
    throw new BrevoError("Brevo is not configured (BREVO_API_KEY / BREVO_SENDER_EMAIL unset)", {
      code: "not_configured",
    });
  }
  if (!to?.email) {
    throw new BrevoError("No recipient email address", { code: "no_recipient" });
  }

  // From defaults to the app's verified BREVO_SENDER_EMAIL. A `senderEmail` is
  // passed only once the merchant's own address is verified with Brevo (callers
  // gate on that) — Brevo rejects an unverified sender. The display name is
  // always free to override.
  const sender = {
    email: senderEmail?.trim() || config.sender.email,
    name: senderName?.trim() || config.sender.name,
  };

  const body = {
    sender,
    to: [{ email: to.email, ...(to.name ? { name: to.name } : {}) }],
    subject,
    htmlContent,
    ...(replyTo?.email ? { replyTo: { email: replyTo.email, name: replyTo.name } } : {}),
    ...(tags?.length ? { tags } : {}),
  };

  let response;
  try {
    response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": config.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    // Network-level failure (DNS, timeout, TLS) — never reached the API.
    throw new BrevoError(`Couldn't reach Brevo: ${error.message}`, { code: "network_error" });
  }

  if (!response.ok) {
    // Brevo returns { code, message } on error. Read it if we can so the log
    // says what actually went wrong (bad key, unverified sender, ...).
    const detail = await response.json().catch(() => null);
    throw new BrevoError(
      `Brevo rejected the email (${response.status}): ${detail?.message ?? "unknown error"}`,
      { status: response.status, code: detail?.code ?? null },
    );
  }

  const result = await response.json().catch(() => ({}));
  return { messageId: result.messageId ?? null };
}

// The app's default From address — shown in the UI as the sender used until a
// merchant verifies their own.
export function defaultSenderEmail() {
  return brevoConfig()?.sender.email ?? "";
}

// Small helper for the Senders admin endpoints. Same auth/error shape as the
// send call above.
async function brevoRequest(path, { method = "GET", body } = {}) {
  const config = brevoConfig();
  if (!config) {
    throw new BrevoError("Brevo is not configured (BREVO_API_KEY / BREVO_SENDER_EMAIL unset)", {
      code: "not_configured",
    });
  }
  let response;
  try {
    response = await fetch(`https://api.brevo.com/v3${path}`, {
      method,
      headers: {
        "api-key": config.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new BrevoError(`Couldn't reach Brevo: ${error.message}`, { code: "network_error" });
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new BrevoError(data?.message ?? `Brevo error (${response.status})`, {
      status: response.status,
      code: data?.code ?? null,
    });
  }
  return data;
}

// Looks up a sender by email in the Brevo account, returning its id and whether
// it's already verified (active), or null if it isn't registered yet.
export async function getBrevoSender(email) {
  const data = await brevoRequest("/senders");
  const match = (data?.senders ?? []).find(
    (s) => s.email?.toLowerCase() === String(email).toLowerCase(),
  );
  return match ? { id: match.id, active: Boolean(match.active) } : null;
}

// Registers a sender email with Brevo. Brevo emails a one-time code to the
// address for verification; if the address's domain is already authenticated it
// comes back active straight away. Returns { id, active }. An email that's
// already registered is looked up rather than treated as an error.
export async function createBrevoSender({ email, name }) {
  try {
    const created = await brevoRequest("/senders", { method: "POST", body: { name: name || email, email } });
    // The create response carries the new sender id — use it directly. A lookup
    // right after creation can come back empty, so we only use GET to learn the
    // active flag (an already-authenticated domain is active with no code).
    let id = created?.id ?? null;
    let active = false;
    const found = await getBrevoSender(email).catch(() => null);
    if (found) {
      id = id ?? found.id;
      active = found.active;
    }
    if (id == null) {
      throw new BrevoError("Brevo did not return a sender id.", { code: "sender_not_found" });
    }
    return { id, active };
  } catch (error) {
    // Already registered → use the existing sender.
    const existing = await getBrevoSender(email).catch(() => null);
    if (existing) return existing;
    throw error;
  }
}

// Confirms ownership of a sender with the one-time code Brevo emailed.
export async function validateBrevoSender({ senderId, otp }) {
  await brevoRequest(`/senders/${senderId}/validate`, {
    method: "PUT",
    body: { otp: Number(otp) },
  });
  return true;
}
