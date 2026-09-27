import { authenticate } from "../../shopify.server";
import { translateError } from "../../i18n/errors";
import { getRequestT } from "../../i18n/server";
import {
  getOrCreateAppSettings,
  serializeFormSettings,
  saveFormSettings,
} from "../../services/app-settings.server";

// GET /api/form-settings -> current withdrawal form configuration
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const doc = await getOrCreateAppSettings(session.shop);
  return Response.json({ formSettings: serializeFormSettings(doc) });
};

// PUT/PATCH /api/form-settings -> replace the withdrawal form configuration
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const t = getRequestT(request);

  if (request.method === "PUT" || request.method === "PATCH") {
    const body = await request.json();
    try {
      const formSettings = await saveFormSettings(session.shop, body);
      return Response.json({ formSettings });
    } catch (error) {
      return Response.json({ error: translateError(error, t) }, { status: 400 });
    }
  }

  return Response.json({ error: t("errors.methodNotAllowed") }, { status: 405 });
};
