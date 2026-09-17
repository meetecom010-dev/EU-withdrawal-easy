/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import {
  startSenderVerification,
  confirmSenderVerification,
  refreshSenderStatus,
  removeCustomSender,
} from "../../../utils/api/emailSettings";

// Shop-level sender identity, laid out as two fields: the sender email (with its
// verify flow) on the left, the reply-to on the right. Reply-to saves with the
// Save bar; the sender email is a separate, immediate flow — register with
// Brevo, confirm the emailed code, then we send from it. Until verified, emails
// go from the app's default address.
export default function SenderSettings({ sender, defaultFromEmail, update, dismissError, errors }) {
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
      setInfo(`We've emailed a verification code to ${result.fromEmail}.`);
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
      setInfo("Not verified yet — check your inbox for the code, then try again.");
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
      ? "Emails are sent from this address."
      : status === "pending"
        ? "Enter the code we emailed to verify this address."
        : `Leave blank to use ${defaultFromEmail || "the app's verified address"}, or add your own.`;

  return (
    <s-section heading="Email settings">
      <s-stack direction="block" gap="base">
        <s-paragraph color="subdued">
          These apply to every email your store sends. Send from your own verified address, and set
          where customer replies go.
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

        <s-query-container>
          <s-grid
            gridTemplateColumns="@container (inline-size > 640px) 1fr 1fr, 1fr"
            gap="base"
            alignItems="start"
          >
            {/* Left: sender email + its verify flow */}
            <s-stack direction="block" gap="small-300">
              <s-email-field
                label="Sender email address"
                value={status === "none" ? emailInput : customEmail}
                disabled={status !== "none" || undefined}
                placeholder="you@yourstore.com"
                details={senderDetails}
                onInput={(e) => setEmailInput(e.currentTarget.value)}
              ></s-email-field>

              {status === "verified" ? (
                <s-stack direction="inline" gap="small-200" alignItems="center">
                  <s-badge tone="success">Verified</s-badge>
                  <s-button
                    variant="tertiary"
                    tone="critical"
                    loading={busy || undefined}
                    onClick={onRemove}
                  >
                    Remove
                  </s-button>
                </s-stack>
              ) : status === "pending" ? (
                <s-stack direction="block" gap="small-300">
                  <s-text-field
                    label="Verification code"
                    value={otp}
                    placeholder="123456"
                    details="The 6-digit code from the email we just sent."
                    onInput={(e) => setOtp(e.currentTarget.value)}
                  ></s-text-field>
                  <s-stack direction="inline" gap="base">
                    <s-button
                      variant="primary"
                      loading={busy || undefined}
                      disabled={!otp.trim() || undefined}
                      onClick={onConfirm}
                    >
                      Confirm
                    </s-button>
                    <s-button variant="tertiary" loading={busy || undefined} onClick={onRefresh}>
                      I verified via email
                    </s-button>
                    <s-button
                      variant="tertiary"
                      tone="critical"
                      loading={busy || undefined}
                      onClick={onRemove}
                    >
                      Cancel
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
                    Verify email
                  </s-button>
                </s-stack>
              )}
            </s-stack>

            {/* Right: reply-to */}
            <s-email-field
              label="Reply-to email"
              value={sender.replyTo}
              error={errors["sender.replyTo"]}
              placeholder="support@yourstore.com"
              details="By default we use your store email for replies. Change it to route replies elsewhere."
              onInput={(e) => update("sender.replyTo", e.currentTarget.value)}
              onFocus={() => dismissError("sender.replyTo")}
            ></s-email-field>
          </s-grid>
        </s-query-container>
      </s-stack>
    </s-section>
  );
}
