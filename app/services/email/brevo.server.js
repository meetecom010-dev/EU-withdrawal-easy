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
 *   tags?: string[],
 * }} message
 * @returns {Promise<{ messageId: string | null }>}
 * @throws {BrevoError} when not configured, no recipient, or Brevo rejects it
 */
export async function sendTransactionalEmail({ to, subject, htmlContent, replyTo, tags }) {
  const config = brevoConfig();
  if (!config) {
    throw new BrevoError("Brevo is not configured (BREVO_API_KEY / BREVO_SENDER_EMAIL unset)", {
      code: "not_configured",
    });
  }
  if (!to?.email) {
    throw new BrevoError("No recipient email address", { code: "no_recipient" });
  }

  const body = {
    sender: config.sender,
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
