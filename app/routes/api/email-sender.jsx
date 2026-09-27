import { authenticate } from "../../shopify.server";
import { translateError } from "../../i18n/errors";
import { getRequestT } from "../../i18n/server";
import {
  startSenderVerification,
  confirmSenderVerification,
  refreshSenderStatus,
  removeCustomSender,
} from "../../services/email-sender.server";

// POST /api/email-sender — manages the merchant's custom From address.
//   { intent: "start", email, name }  -> register with Brevo, send the code
//   { intent: "confirm", otp }        -> confirm ownership with the code
//   { intent: "refresh" }             -> re-check verification status
//   { intent: "remove" }              -> revert to the app default
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const t = getRequestT(request);
  const body = await request.json().catch(() => ({}));

  try {
    switch (body.intent) {
      case "start":
        return Response.json(
          await startSenderVerification(session.shop, { email: body.email, name: body.name }),
        );
      case "confirm":
        return Response.json(await confirmSenderVerification(session.shop, { otp: body.otp }));
      case "refresh":
        return Response.json(await refreshSenderStatus(session.shop));
      case "remove":
        return Response.json(await removeCustomSender(session.shop));
      default:
        return Response.json({ error: t("errors.unknownAction") }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: translateError(error, t) }, { status: 400 });
  }
};
