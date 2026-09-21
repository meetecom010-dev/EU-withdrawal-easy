// Slack transport for internal alerting. The single place that talks to the
// Slack Web API — app/services/slack/alert-error.server.js builds message
// content and hands it here, mirroring app/services/email/brevo.server.js.
//
// Unlike Brevo's transport, this one never throws: an alerting failure must
// never break the request/job that triggered the alert. Every path resolves
// to { sent, error }.

const SLACK_POST_MESSAGE_ENDPOINT = "https://slack.com/api/chat.postMessage";

// Resolved once per call rather than at module load, so a token added to the
// environment after boot is picked up without a restart. Returns null when
// the integration isn't configured — callers treat that as "skip", never
// "fail".
export function slackConfig() {
  const botToken = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_ALERT_CHANNEL;
  if (!botToken || !channel) return null;
  return { botToken, channel };
}

export function isSlackConfigured() {
  return slackConfig() !== null;
}

/**
 * Posts one message to the configured Slack alert channel via chat.postMessage.
 *
 * @param {{ text: string, blocks?: object[] }} message
 * @returns {Promise<{ sent: boolean, error: string | null }>}
 */
export async function postMessage({ text, blocks }) {
  const config = slackConfig();
  if (!config) {
    return { sent: false, error: "not_configured" };
  }

  let response;
  try {
    response = await fetch(SLACK_POST_MESSAGE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.botToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel: config.channel, text, ...(blocks ? { blocks } : {}) }),
    });
  } catch (error) {
    // Network-level failure (DNS, timeout, TLS) — never reached the API.
    return { sent: false, error: `network_error: ${error.message}` };
  }

  // Slack's Web API returns HTTP 200 even on failure, with { ok: false,
  // error: "..." } in the body — the HTTP status alone doesn't tell us
  // whether the message actually posted.
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    return { sent: false, error: body?.error ?? `http_${response.status}` };
  }

  return { sent: true, error: null };
}
