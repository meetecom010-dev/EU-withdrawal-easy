/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  startDomainAuth,
  refreshDomainAuth,
  removeDomainAuth,
} from "../../../utils/api/emailSettings";
import { isFreeEmailDomain } from "../../../utils/freeEmailDomains";

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
  const { t } = useTranslation();
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
      setInfo(t("emailTemplates.domain.pendingInfo"));
    }
  }

  async function onRefresh() {
    const result = await run(() => refreshDomainAuth());
    if (!result) return;
    setStatus(result.status);
    setDnsRecords(result.dnsRecords);
    if (result.status !== "verified") {
      setInfo(t("emailTemplates.domain.notVerifiedYet"));
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
    <s-section heading={t("emailTemplates.domain.heading")}>
      <s-stack direction="block" gap="base">
        <s-paragraph color="subdued">{t("emailTemplates.domain.description")}</s-paragraph>

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
          label={t("emailTemplates.domain.label")}
          value={status === "none" ? domainInput : domainName}
          disabled={status !== "none" || undefined}
          placeholder={t("emailTemplates.domain.placeholder")}
          details={t("emailTemplates.domain.details")}
          onInput={(e) => setDomainInput(e.currentTarget.value)}
        ></s-text-field>

        {showFreeProviderWarning && (
          <s-banner tone="warning">
            <s-paragraph>{t("emailTemplates.domain.freeProviderWarning")}</s-paragraph>
          </s-banner>
        )}

        {status === "verified" ? (
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-badge tone="success">{t("common.verified")}</s-badge>
            <s-button variant="tertiary" tone="critical" loading={busy || undefined} onClick={onRemove}>
              {t("common.remove")}
            </s-button>
          </s-stack>
        ) : status === "pending" ? (
          <s-stack direction="block" gap="small-300">
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header>{t("emailTemplates.domain.columns.record")}</s-table-header>
                <s-table-header>{t("emailTemplates.domain.columns.type")}</s-table-header>
                <s-table-header>{t("emailTemplates.domain.columns.host")}</s-table-header>
                <s-table-header>{t("emailTemplates.domain.columns.value")}</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {dnsRecords.map((record) => (
                  <s-table-row key={record.recordType}>
                    <s-table-cell>
                      {t(`emailTemplates.domain.records.${record.recordType}`, { defaultValue: record.recordType })}
                    </s-table-cell>
                    <s-table-cell>{record.type}</s-table-cell>
                    <s-table-cell>
                      <s-stack direction="inline" gap="small-200" alignItems="center">
                        <s-text>{record.hostName}</s-text>
                        <s-button
                          variant="tertiary"
                          icon="duplicate"
                          accessibilityLabel={t("emailTemplates.domain.copyHost")}
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
                          accessibilityLabel={t("emailTemplates.domain.copyValue")}
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
                {t("emailTemplates.domain.verifyRecords")}
              </s-button>
              <s-button variant="tertiary" tone="critical" loading={busy || undefined} onClick={onRemove}>
                {t("common.cancel")}
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
              {t("emailTemplates.domain.authenticate")}
            </s-button>
          </s-stack>
        )}
      </s-stack>
    </s-section>
  );
}
