import connectDB from "../db.server";
import FeatureRequest from "../models/feature-request.server";
import { postMessage } from "./slack/slack.server";

// Strips the mongoose document down to a plain, network-safe object.
export function serializeFeatureRequest(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(obj._id),
    firstName: obj.firstName,
    lastName: obj.lastName,
    email: obj.email,
    request: obj.request,
    submittedAt: obj.submittedAt,
  };
}

export async function submitFeatureRequest(shop, { firstName, lastName, email, request }) {
  await connectDB();
  const doc = await FeatureRequest.create({ shop, firstName, lastName, email, request });

  // Best-effort internal notification — Slack being unconfigured or down must
  // never fail the submission itself, so its outcome is ignored here.
  await postMessage({
    text: `:bulb: New feature request from *${shop}*\n*${firstName} ${lastName}* (${email})\n${request}`,
  });

  return serializeFeatureRequest(doc);
}
