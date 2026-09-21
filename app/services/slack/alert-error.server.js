// Formats and sends internal error alerts to Slack. This is the function
// every error-handling call site should use — it always resolves and never
// throws, so callers never need to wrap it in their own try/catch.

import { postMessage } from "./slack.server";

// Trimmed so one alert doesn't dump an entire stack trace into the channel.
const STACK_LINES = 5;

function formatMessage({ context, error, shop, extra }) {
  const lines = [
    `:rotating_light: *${context}*${shop ? ` — \`${shop}\`` : ""}`,
    `> ${error?.message ?? String(error)}`,
  ];

  if (extra && Object.keys(extra).length > 0) {
    const extraLines = Object.entries(extra)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
    lines.push(`\`\`\`${extraLines}\`\`\``);
  }

  const stack = error?.stack?.split("\n").slice(0, STACK_LINES).join("\n");
  if (stack) {
    lines.push(`\`\`\`${stack}\`\`\``);
  }

  return lines.join("\n");
}

/**
 * Sends an error alert to the configured Slack channel. Never throws — a
 * failure to notify Slack must never break the caller's own error handling.
 *
 * @param {{ context: string, error: Error, shop?: string, extra?: Record<string, unknown> }} params
 * @returns {Promise<void>}
 */
export async function alertError({ context, error, shop, extra }) {
  try {
    const { sent, error: sendError } = await postMessage({ text: formatMessage({ context, error, shop, extra }) });
    if (!sent && sendError !== "not_configured") {
      console.error(`Slack alert failed (${context}): ${sendError}`);
    }
  } catch (alertingError) {
    console.error(`Slack alert threw unexpectedly (${context}):`, alertingError);
  }
}
