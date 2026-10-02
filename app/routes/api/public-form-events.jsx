import { authenticate } from "../../shopify.server";
import {
  FORM_EVENT_TYPES,
  PUBLIC_FORM_EVENT_TYPES,
  recordFormEvent,
} from "../../services/form-events/index.server";
import { hit, LIMITS } from "../../services/rate-limit.server";

// POST /api/public-form-events -> records a pre-submission funnel event
// (button viewed / form opened) from the order-status extension. These happen
// before a withdrawal request exists, so they're keyed by shop + orderId +
// sessionId and stitched to the request later through the shared orderId.
//
// Verified via the extension's session token, same as the other public
// endpoints — see app/routes/api/public-form-settings.jsx for why `dest` is
// read as a bare domain. That token proves the caller is a real customer on
// this shop's order-status page; only the two funnel types are accepted, so a
// forged "return_created" or "automation_completed" can't be posted here.
async function handleRequest(request) {
  const { sessionToken, cors } = await authenticate.public.customerAccount(request);
  const shop = sessionToken.dest.replace(/^https?:\/\//, "");

  if (request.method !== "POST") {
    return cors(Response.json({ error: "Method not allowed" }, { status: 405 }));
  }

  const body = await request.json().catch(() => ({}));
  const type = body?.type;

  if (!PUBLIC_FORM_EVENT_TYPES.has(type)) {
    return cors(Response.json({ error: "Unsupported event type" }, { status: 400 }));
  }
  // Order ids are always Order GIDs on this surface; anything else is junk
  // that would otherwise create a stray FormEvent document.
  if (typeof body?.orderId !== "string" || !/^gid:\/\/shopify\/Order\/\d+$/.test(body.orderId)) {
    return cors(Response.json({ error: "orderId is required" }, { status: 400 }));
  }

  // Funnel pings are cheap per call but each can create a document, so one
  // customer can't flood the collection.
  if (!hit(`events:${shop}:${sessionToken.sub ?? ""}`, LIMITS.eventsPerCustomer)) {
    return cors(Response.json({ error: "Too many requests" }, { status: 429 }));
  }

  await recordFormEvent(shop, body.orderId, {
    type,
    status: "ok",
    sessionId: typeof body.sessionId === "string" ? body.sessionId : null,
    message:
      type === FORM_EVENT_TYPES.BUTTON_VIEWED
        ? "Customer saw the withdrawal button"
        : "Customer opened the withdrawal form",
  });

  // 202: accepted for recording. The extension fires these fire-and-forget and
  // doesn't read the body, so there's nothing to return.
  return cors(Response.json({ ok: true }, { status: 202 }));
}

export const loader = ({ request }) => handleRequest(request);
export const action = ({ request }) => handleRequest(request);
