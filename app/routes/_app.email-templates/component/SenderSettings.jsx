/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  startSenderVerification,
  confirmSenderVerification,
  refreshSenderStatus,
  removeCustomSender,
} from "../../../utils/api/emailSettings";
import { isFreeEmailDomain } from "../../../utils/freeEmailDomains";

// Shop-level sender identity, laid out as two fields: the sender email (with its
// verify flow) on the left, the reply-to on the right. Reply-to saves with the
// Save bar; the sender email is a separate, immediate flow — register with
// Brevo, confirm the emailed code, then we send from it. Until verified, emails
// go from the app's default address.
export default function SenderSettings({ sender, defaultFromEmail, update, dismissError, errors }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(sender.fromEmailStatus || "none");
  const [customEmail, setCustomEmail] = useState(sender.fromEmail || "");
  const [emailInput, setEmailInput] = useState(sender.fromEmail || "");
  const [otp, setOtp] = useState("");
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
    const result = await run(() => startSenderVerification(emailInput.trim(), sender.fromName));
    if (!result) return;
    setCustomEmail(result.fromEmail);
    setStatus(result.fromEmailStatus);
    if (result.fromEmailStatus === "pending") {
      setInfo(t("emailTemplates.sender.codeSent", { email: result.fromEmail }));
    }
  }

  async function onConfirm() {
    const result = await run(() => confirmSenderVerification(otp.trim()));
    if (!result) return;
    setStatus("verified");
    setOtp("");
  }

  async function onRefresh() {
    const result = await run(() => refreshSenderStatus());
    if (!result) return;
    setStatus(result.fromEmailStatus);
    if (result.fromEmailStatus !== "verified") {
      setInfo(t("emailTemplates.sender.notVerifiedYet"));
    }
  }

  async function onRemove() {
    const result = await run(() => removeCustomSender());
    if (!result) return;
    setStatus("none");
    setCustomEmail("");
    setEmailInput("");
    setOtp("");
  }

  const senderDetails =
    status === "verified"
      ? t("emailTemplates.sender.detailsVerified")
      : status === "pending"
        ? t("emailTemplates.sender.detailsPending")
        : defaultFromEmail
          ? t("emailTemplates.sender.detailsDefault", { email: defaultFromEmail })
          : t("emailTemplates.sender.detailsDefaultFallback");

  const showFreeProviderWarning = status === "none" && isFreeEmailDomain(emailInput);

  return (
    <s-section heading={t("emailTemplates.sender.heading")}>
      <s-stack direction="block" gap="base">
        <s-paragraph color="subdued">{t("emailTemplates.sender.description")}</s-paragraph>

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

        <s-query-container>
          <s-grid
            gridTemplateColumns="@container (inline-size > 640px) 1fr 1fr, 1fr"
            gap="base"
            alignItems="start"
          >
            {/* Left: sender email + its verify flow */}
            <s-stack direction="block" gap="small-300">
              <s-email-field
                label={t("emailTemplates.sender.emailLabel")}
                value={status === "none" ? emailInput : customEmail}
                disabled={status !== "none" || undefined}
                placeholder={t("emailTemplates.sender.emailPlaceholder")}
                details={senderDetails}
                onInput={(e) => setEmailInput(e.currentTarget.value)}
              ></s-email-field>

              {showFreeProviderWarning && (
                <s-banner tone="warning">
                  <s-paragraph>{t("emailTemplates.sender.freeProviderWarning")}</s-paragraph>
                </s-banner>
              )}

              {status === "verified" ? (
                <s-stack direction="inline" gap="small-200" alignItems="center">
                  <s-badge tone="success">{t("common.verified")}</s-badge>
                  <s-button
                    variant="tertiary"
                    tone="critical"
                    loading={busy || undefined}
                    onClick={onRemove}
                  >
                    {t("common.remove")}
                  </s-button>
                </s-stack>
              ) : status === "pending" ? (
                <s-stack direction="block" gap="small-300">
                  <s-text-field
                    label={t("emailTemplates.sender.codeLabel")}
                    value={otp}
                    placeholder="123456"
                    details={t("emailTemplates.sender.codeDetails")}
                    onInput={(e) => setOtp(e.currentTarget.value)}
                  ></s-text-field>
                  <s-stack direction="inline" gap="base">
                    <s-button
                      variant="primary"
                      loading={busy || undefined}
                      disabled={!otp.trim() || undefined}
                      onClick={onConfirm}
                    >
                      {t("emailTemplates.sender.verifyCode")}
                    </s-button>
                    <s-button variant="tertiary" loading={busy || undefined} onClick={onRefresh}>
                      {t("emailTemplates.sender.checkStatus")}
                    </s-button>
                    <s-button
                      variant="tertiary"
                      tone="critical"
                      loading={busy || undefined}
                      onClick={onRemove}
                    >
                      {t("common.cancel")}
                    </s-button>
                  </s-stack>
                </s-stack>
              ) : (
                <s-stack direction="inline">
                  <s-button
                    variant="primary"
                    loading={busy || undefined}
                    disabled={!emailInput.trim() || undefined}
                    onClick={onStart}
                  >
                    {t("emailTemplates.sender.verifyEmail")}
                  </s-button>
                </s-stack>
              )}
            </s-stack>

            {/* Right: reply-to */}
            <s-email-field
              label={t("emailTemplates.sender.replyToLabel")}
              value={sender.replyTo}
              error={errors["sender.replyTo"]}
              placeholder={t("emailTemplates.sender.replyToPlaceholder")}
              details={t("emailTemplates.sender.replyToDetails")}
              onInput={(e) => update("sender.replyTo", e.currentTarget.value)}
              onFocus={() => dismissError("sender.replyTo")}
            ></s-email-field>
          </s-grid>
        </s-query-container>
      </s-stack>
    </s-section>
  );
}
