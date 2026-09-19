import { authenticate } from "../../shopify.server";
import {
  startDomainAuth,
  refreshDomainAuth,
  removeDomainAuth,
} from "../../services/email-domain.server";

// POST /api/email-domain — manages the merchant's domain-level authentication.
//   { intent: "start", domain }  -> register the domain with Brevo, return its DNS records
//   { intent: "refresh" }        -> re-check the domain's DNS records
//   { intent: "remove" }         -> delete the domain and revert to none
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const body = await request.json().catch(() => ({}));

  try {
    switch (body.intent) {
      case "start":
        return Response.json(await startDomainAuth(session.shop, { domain: body.domain }));
      case "refresh":
        return Response.json(await refreshDomainAuth(session.shop));
      case "remove":
        return Response.json(await removeDomainAuth(session.shop));
      default:
        return Response.json({ error: "Unknown intent" }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
};
