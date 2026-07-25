// The custom sender-email verification flow. A merchant can send from their own
// address instead of the app default — but Brevo (and receiving inboxes) only
// accept a verified sender, so we register the address with Brevo, they confirm
// ownership with the one-time code Brevo emails them, and only then does the
// send path use it as the From address.
//
// State lives on emailSettings.sender (fromEmail / fromEmailStatus /
// brevoSenderId) and is managed here, separate from the template Save bar.

import connectDB from "../db.server";
import AppSettings from "../models/app-settings.server";
import {
  createBrevoSender,
  validateBrevoSender,
  getBrevoSender,
} from "./email/brevo.server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function setSenderFields(shop, fields) {
  await connectDB();
  const $set = {};
  for (const [key, value] of Object.entries(fields)) {
    $set[`emailSettings.sender.${key}`] = value;
  }
  await AppSettings.findOneAndUpdate(
    { shop },
    { $set },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

// Registers the merchant's chosen From address with Brevo and stores it as
// pending (or verified, if Brevo already trusts the domain). Brevo emails a
// one-time code to the address to confirm ownership.
export async function startSenderVerification(shop, { email, name }) {
  const clean = String(email ?? "").trim();
  if (!EMAIL_RE.test(clean)) {
    throw new Error("Enter a valid email address.");
  }

  const { id, active } = await createBrevoSender({ email: clean, name });
  const status = active ? "verified" : "pending";
  await setSenderFields(shop, {
    fromEmail: clean,
    fromEmailStatus: status,
    brevoSenderId: id ?? null,
  });
  return { fromEmail: clean, fromEmailStatus: status };
}

// Confirms ownership with the one-time code the merchant received, flipping the
// stored status to verified.
export async function confirmSenderVerification(shop, { otp }) {
  const code = String(otp ?? "").trim();
  if (!code) {
    throw new Error("Enter the verification code from your email.");
  }

  await connectDB();
  const doc = await AppSettings.findOne({ shop });
  let senderId = doc?.emailSettings?.sender?.brevoSenderId;
  const email = doc?.emailSettings?.sender?.fromEmail;

  // Self-heal: if the id wasn't stored (e.g. an earlier start before the lookup
  // fix), recover it from Brevo using the pending email so the merchant can
  // still confirm with the code they received.
  if (!senderId && email) {
    const found = await getBrevoSender(email).catch(() => null);
    if (found?.id) {
      senderId = found.id;
      await setSenderFields(shop, { brevoSenderId: found.id });
    }
  }
  if (!senderId) {
    throw new Error(
      email
        ? "We couldn't find this sender in Brevo. Remove the email and add it again to get a fresh code."
        : "Start email verification first.",
    );
  }

  await validateBrevoSender({ senderId, otp: code });
  await setSenderFields(shop, { fromEmailStatus: "verified" });
  return { fromEmailStatus: "verified" };
}

// Re-checks the address's status with Brevo (useful if the merchant verified via
// Brevo's own email link rather than entering the code here).
export async function refreshSenderStatus(shop) {
  await connectDB();
  const doc = await AppSettings.findOne({ shop });
  const email = doc?.emailSettings?.sender?.fromEmail;
  if (!email) return { fromEmail: "", fromEmailStatus: "none" };

  const status = await getBrevoSender(email);
  const next = status?.active ? "verified" : "pending";
  await setSenderFields(shop, {
    fromEmailStatus: next,
    ...(status?.id ? { brevoSenderId: status.id } : {}),
  });
  return { fromEmail: email, fromEmailStatus: next };
}

// Clears the custom sender, reverting to the app default address.
export async function removeCustomSender(shop) {
  await setSenderFields(shop, { fromEmail: "", fromEmailStatus: "none", brevoSenderId: null });
  return { fromEmail: "", fromEmailStatus: "none" };
}
