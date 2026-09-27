import { authenticate } from "../../shopify.server";
import { translateError } from "../../i18n/errors";
import { getRequestT } from "../../i18n/server";
import { submitFeatureRequest } from "../../services/feature-request.server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/feature-requests -> file a "Request a feature" submission
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const t = getRequestT(request);

  if (request.method !== "POST") {
    return Response.json({ error: t("errors.methodNotAllowed") }, { status: 405 });
  }

  const body = await request.json();
  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  const email = (body.email ?? "").trim();
  const featureRequest = (body.request ?? "").trim();

  if (!firstName || !lastName || !email || !featureRequest) {
    return Response.json({ error: t("errors.featureRequestIncomplete") }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: t("errors.invalidEmail") }, { status: 400 });
  }

  try {
    const featureRequestDoc = await submitFeatureRequest(session.shop, {
      firstName,
      lastName,
      email,
      request: featureRequest,
    });
    return Response.json({ featureRequest: featureRequestDoc });
  } catch (error) {
    return Response.json({ error: translateError(error, t) }, { status: 400 });
  }
};
