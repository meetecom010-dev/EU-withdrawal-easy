import { authenticate } from "../shopify.server";
import connectDB from "../db.server";
import Shop from "../models/shop.server";
import Session from "../models/session.server";
import WithdrawalRequest from "../models/withdrawal-request.server";
import AppSettings from "../models/app-settings.server";
import AutomationJob from "../models/automation-job.server";
import FeatureRequest from "../models/feature-request.server";
import FormEvent from "../models/form-event.server";

// Mandatory GDPR webhook: erase everything this app stored for a shop. Fires
// 48 hours after uninstall, without admin/session context, so it must not
// depend on an active session existing.
export const action = async ({ request }) => {
  const { topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await connectDB();
  await Promise.all([
    WithdrawalRequest.deleteMany({ shop }),
    AppSettings.deleteMany({ shop }),
    AutomationJob.deleteMany({ shop }),
    FeatureRequest.deleteMany({ shop }),
    FormEvent.deleteMany({ shop }),
    Session.deleteMany({ shop }),
    Shop.deleteMany({ shop }),
  ]);

  return new Response();
};
