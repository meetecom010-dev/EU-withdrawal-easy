import { drainDueJobs } from "../../services/automation-jobs.server";
import { runScheduledAutomationJob } from "../../services/withdrawal-automation.server";

// POST /api/internal-run-automations -> runs scheduled automation work that has
// come due: releasing a fulfillment hold after N days, and the delayed
// cancel+refund.
//
// Point your platform's scheduler at this every few minutes:
//   curl -X POST https://<app-host>/api/internal-run-automations \
//        -H "Authorization: Bearer $AUTOMATION_CRON_SECRET"
//
// Cadence isn't critical — jobs are due-at based, so a missed tick just means
// the work runs on the next one rather than being lost. Overlapping ticks are
// safe too: claiming is a single atomic update per job.
function isAuthorized(request) {
  // eslint-disable-next-line no-undef
  const secret = process.env.AUTOMATION_CRON_SECRET;
  // Refusing everything while unset is deliberate — an unauthenticated
  // endpoint that cancels orders is worse than one that doesn't run.
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.replace(/^Bearer\s+/i, "");

  // Length-independent comparison isn't available without node:crypto here;
  // the secret is high-entropy and single-purpose, so a plain compare is
  // acceptable. Rotate it with the env var if it ever leaks.
  return provided.length > 0 && provided === secret;
}

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await drainDueJobs(runScheduledAutomationJob);
  return Response.json({ ok: true, ...summary });
};

// GET is a health check for the scheduler itself — it confirms the endpoint is
// reachable and the secret is right without running any work.
export const loader = async ({ request }) => {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ ok: true, message: "Automation runner ready. POST to run due jobs." });
};
