// The self-serve domain-authentication flow. Verifying a single sender
// address (email-sender.server.js) only proves mailbox ownership — it does
// nothing for the *domain*, so Brevo still substitutes brevosend.com as the
// sending domain unless the domain itself is authenticated (SPF/DKIM/DMARC).
// This registers a merchant's domain with Brevo, surfaces the DNS records
// they need to add, and re-checks on request. Once a domain here is verified,
// createBrevoSender (email-sender.server.js) returns any address on it as
// active immediately — no OTP needed.
//
// State lives on emailSettings.domain (name / status / dnsRecords) and is
// managed here, separate from the template Save bar and from `sender`.

import connectDB from "../db.server";
import AppSettings from "../models/app-settings.server";
import {
  createBrevoDomain,
  getBrevoDomain,
  authenticateBrevoDomain,
  deleteBrevoDomain,
} from "./email/brevo.server";
import { isFreeEmailDomain } from "../utils/freeEmailDomains";

const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

async function setDomainFields(shop, fields) {
  await connectDB();
  const $set = {};
  for (const [key, value] of Object.entries(fields)) {
    $set[`emailSettings.domain.${key}`] = value;
  }
  await AppSettings.findOneAndUpdate(
    { shop },
    { $set },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

// Brevo returns dns_records as an object keyed by record purpose
// (brevo_code / dkim_record / dmarc_record); flatten it into an array so the
// UI can just render a table.
function normalizeDnsRecords(dnsRecords) {
  if (!dnsRecords) return [];
  return Object.entries(dnsRecords)
    .filter(([, record]) => record)
    .map(([recordType, record]) => ({
      recordType,
      type: record.type ?? "",
      hostName: record.host_name ?? "",
      value: record.value ?? "",
      verified: Boolean(record.status),
    }));
}

// Registers the merchant's domain with Brevo and stores the DNS records they
// need to add. A domain already trusted by Brevo (e.g. re-added after a
// removal) can come back authenticated with no further action.
export async function startDomainAuth(shop, { domain }) {
  const clean = String(domain ?? "").trim().toLowerCase();
  if (!DOMAIN_RE.test(clean)) {
    throw new Error("Enter a valid domain, like yourstore.com.");
  }
  if (isFreeEmailDomain(clean)) {
    throw new Error("Free email providers (Gmail, Yahoo, etc.) can't be authenticated — use your own domain.");
  }

  await createBrevoDomain({ name: clean }).catch(() => {
    // Already registered on this Brevo account — fall through to the GET
    // below, which is the source of truth either way.
  });
  const info = await getBrevoDomain(clean);
  const dnsRecords = normalizeDnsRecords(info?.dns_records);
  const status = info?.authenticated ? "verified" : "pending";
  await setDomainFields(shop, { name: clean, status, dnsRecords });
  return { name: clean, status, dnsRecords };
}

// Re-checks the domain's DNS records with Brevo. Triggers a fresh
// authentication attempt first (best-effort — its own response isn't
// authoritative), then reads the real status back.
export async function refreshDomainAuth(shop) {
  await connectDB();
  const doc = await AppSettings.findOne({ shop });
  const name = doc?.emailSettings?.domain?.name;
  if (!name) return { name: "", status: "none", dnsRecords: [] };

  await authenticateBrevoDomain(name).catch(() => {
    // Non-fatal — the records may simply not have propagated yet. The
    // getBrevoDomain call below still reports the current real status.
  });
  const info = await getBrevoDomain(name);
  const dnsRecords = normalizeDnsRecords(info?.dns_records);
  const status = info?.authenticated ? "verified" : "pending";
  await setDomainFields(shop, { status, dnsRecords });
  return { name, status, dnsRecords };
}

// Removes the domain from Brevo and clears the stored state.
export async function removeDomainAuth(shop) {
  await connectDB();
  const doc = await AppSettings.findOne({ shop });
  const name = doc?.emailSettings?.domain?.name;
  if (name) {
    await deleteBrevoDomain(name).catch((error) => {
      if (error.status !== 404) throw error;
    });
  }
  await setDomainFields(shop, { name: "", status: "none", dnsRecords: [] });
  return { name: "", status: "none", dnsRecords: [] };
}
