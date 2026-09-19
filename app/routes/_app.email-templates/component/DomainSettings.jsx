/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import {
  startDomainAuth,
  refreshDomainAuth,
  removeDomainAuth,
} from "../../../utils/api/emailSettings";
import { isFreeEmailDomain } from "../../../utils/freeEmailDomains";

const RECORD_LABELS = {
  brevo_code: "Domain ownership",
  dkim_record: "DKIM",
  dkim1Record: "DKIM 1",
  dkim2Record: "DKIM 2",
  dmarc_record: "DMARC",
};

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard access can fail in insecure/unsupported contexts — the value
    // is still visible in the table for a manual copy.
  }
}

// Domain-level authentication (SPF/DKIM/DMARC), independent of the sender
// email's own OTP flow above it. Authenticating a domain here is what
// actually stops Brevo substituting brevosend.com as the sending domain —
// once verified, any sender address on this domain (SenderSettings) comes
// back active immediately, no OTP needed. Bypasses the Save bar, same as
// SenderSettings: this persists immediately via its own API calls rather
// than through the parent route's `settings`/save flow.
export default function DomainSettings({ domain }) {
  const [status, setStatus] = useState(domain?.status || "none");
  const [domainName, setDomainName] = useState(domain?.name || "");
  const [domainInput, setDomainInput] = useState(domain?.name || "");
  const [dnsRecords, setDnsRecords] = useState(domain?.dnsRecords || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  async function run(fn) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function onStart() {
    const result = await run(() => startDomainAuth(domainInput.trim()));
    if (!result) return;
    setDomainName(result.name);
    setStatus(result.status);
    setDnsRecords(result.dnsRecords);
    if (result.status === "pending") {
      setInfo("Add the records below at your domain's DNS provider, then come back and verify.");
    }
  }

  async function onRefresh() {
    const result = await run(() => refreshDomainAuth());
    if (!result) return;
    setStatus(result.status);
    setDnsRecords(result.dnsRecords);
    if (result.status !== "verified") {
      setInfo("Not verified yet — DNS changes can take a while to propagate. Try again shortly.");
    }
  }

  async function onRemove() {
    const result = await run(() => removeDomainAuth());
    if (!result) return;
    setStatus("none");
    setDomainName("");
    setDomainInput("");
    setDnsRecords([]);
  }

  const showFreeProviderWarning = status === "none" && isFreeEmailDomain(domainInput);

  return (
    <s-section heading="Domain authentication">
      <s-stack direction="block" gap="base">
        <s-paragraph color="subdued">
          Authenticating your own domain stops emails from showing &quot;via brevosend.com&quot; to
          your customers. Optional, but recommended if you&apos;re sending from your own
          store&apos;s domain.
        </s-paragraph>

        {error && (
          <s-banner tone="critical" dismissible onDismiss={() => setError(null)}>
            <s-paragraph>{error}</s-paragraph>
          </s-banner>
        )}
        {info && (
          <s-banner tone="info" dismissible onDismiss={() => setInfo(null)}>
            <s-paragraph>{info}</s-paragraph>
          </s-banner>
        )}

        <s-text-field
          label="Your domain"
          value={status === "none" ? domainInput : domainName}
          disabled={status !== "none" || undefined}
          placeholder="yourstore.com"
          details="Enter the domain your store's emails should send from — not the myshopify.com address."
          onInput={(e) => setDomainInput(e.currentTarget.value)}
        ></s-text-field>

        {showFreeProviderWarning && (
          <s-banner tone="warning">
            <s-paragraph>
              Free providers like Gmail or Yahoo can&apos;t be authenticated — enter your own
              store&apos;s domain instead.
            </s-paragraph>
          </s-banner>
        )}

        {status === "verified" ? (
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-badge tone="success">Verified</s-badge>
            <s-button variant="tertiary" tone="critical" loading={busy || undefined} onClick={onRemove}>
              Remove
            </s-button>
          </s-stack>
        ) : status === "pending" ? (
          <s-stack direction="block" gap="small-300">
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header>Record</s-table-header>
                <s-table-header>Type</s-table-header>
                <s-table-header>Host</s-table-header>
                <s-table-header>Value</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {dnsRecords.map((record) => (
                  <s-table-row key={record.recordType}>
                    <s-table-cell>{RECORD_LABELS[record.recordType] ?? record.recordType}</s-table-cell>
                    <s-table-cell>{record.type}</s-table-cell>
                    <s-table-cell>
                      <s-stack direction="inline" gap="small-200" alignItems="center">
                        <s-text>{record.hostName}</s-text>
                        <s-button
                          variant="tertiary"
                          icon="duplicate"
                          accessibilityLabel="Copy host"
                          onClick={() => copyToClipboard(record.hostName)}
                        ></s-button>
                      </s-stack>
                    </s-table-cell>
                    <s-table-cell>
                      <s-stack direction="inline" gap="small-200" alignItems="center">
                        <s-text>{record.value}</s-text>
                        <s-button
                          variant="tertiary"
                          icon="duplicate"
                          accessibilityLabel="Copy value"
                          onClick={() => copyToClipboard(record.value)}
                        ></s-button>
                      </s-stack>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
            <s-stack direction="inline" gap="base">
              <s-button variant="primary" loading={busy || undefined} onClick={onRefresh}>
                I&apos;ve added these records
              </s-button>
              <s-button variant="tertiary" tone="critical" loading={busy || undefined} onClick={onRemove}>
                Cancel
              </s-button>
            </s-stack>
          </s-stack>
        ) : (
          <s-stack direction="inline">
            <s-button
              variant="primary"
              loading={busy || undefined}
              disabled={!domainInput.trim() || undefined}
              onClick={onStart}
            >
              Authenticate domain
            </s-button>
          </s-stack>
        )}
      </s-stack>
    </s-section>
  );
}
