/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppBridge } from "@shopify/app-bridge-react";

export const DECISION_MODAL_ID = "decision-modal";

// The Approve/Reject confirmation modal. It loads the decision email rendered
// with this request's real data, shows a preview, and lets staff edit the exact
// subject/body for this one send (the saved template is untouched). A checkbox
// covers the "decide without emailing" case. Confirming both sets the status and
// sends the reviewed email.
export default function DecisionModal({
  decision,
  preview,
  loading,
  deciding,
  language,
  releasesHold,
  onConfirm,
}) {
  const { t } = useTranslation();
  const shopify = useAppBridge();
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [editing, setEditing] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  // Seed the editable fields whenever a freshly rendered email arrives, and
  // start "Send email" in the state the template's switch in Email templates
  // is set to.
  useEffect(() => {
    if (preview) {
      setSubject(preview.subject ?? "");
      setHtml(preview.html ?? "");
      setSendEmail(preview.enabled !== false);
    }
  }, [preview]);

  // Reset the editor each time a new decision is opened. "Send email" isn't
  // reset here: it's set from the freshly loaded preview above, and the
  // checkbox is hidden until that preview arrives.
  useEffect(() => {
    setEditing(false);
  }, [decision]);

  const approve = decision === "approved";
  const heading = approve ? t("requestDetail.decisionModal.headingApprove") : t("requestDetail.decisionModal.headingReject");
  const confirmLabel = sendEmail
    ? approve
      ? t("requestDetail.decisionModal.approveAndSend")
      : t("requestDetail.decisionModal.rejectAndSend")
    : approve
      ? t("requestDetail.decisionModal.approve")
      : t("requestDetail.decisionModal.reject");

  function confirm() {
    onConfirm({ subject, html, sendEmail });
    shopify.modal.hide(DECISION_MODAL_ID);
  }

  return (
    <s-modal id={DECISION_MODAL_ID} heading={heading} size="large">
      {loading || !preview ? (
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-spinner size="base" accessibilityLabel={t("requestDetail.decisionModal.loadingLabel")}></s-spinner>
          <s-text color="subdued">{t("requestDetail.decisionModal.loading")}</s-text>
        </s-stack>
      ) : (
        <s-stack direction="block" gap="base">
          <s-checkbox
            label={t("requestDetail.decisionModal.sendEmail")}
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.currentTarget.checked)}
          ></s-checkbox>

          {sendEmail ? (
            <>
              {language && (
                <s-banner tone="info">{t("requestDetail.decisionModal.language", { language })}</s-banner>
              )}
              <s-text-field
                label={t("requestDetail.decisionModal.subject")}
                value={subject}
                onChange={(e) => setSubject(e.currentTarget.value)}
              ></s-text-field>

              <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
                <s-text type="strong">{t("requestDetail.decisionModal.body")}</s-text>
                <s-button variant="tertiary" onClick={() => setEditing((prev) => !prev)}>
                  {editing ? t("common.preview") : t("requestDetail.decisionModal.editHtml")}
                </s-button>
              </s-stack>

              {editing ? (
                <textarea
                  value={html}
                  spellCheck={false}
                  onChange={(e) => setHtml(e.currentTarget.value)}
                  aria-label={t("requestDetail.decisionModal.htmlLabel")}
                  style={{
                    width: "100%",
                    minHeight: "320px",
                    boxSizing: "border-box",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    padding: "12px",
                    border: "1px solid #8a8a8a",
                    borderRadius: "8px",
                    resize: "vertical",
                    color: "#1a1a1a",
                    background: "#ffffff",
                  }}
                />
              ) : (
                <iframe
                  title={t("requestDetail.decisionModal.previewTitle")}
                  srcDoc={html}
                  style={{
                    width: "100%",
                    height: "440px",
                    border: "1px solid #e1e3e5",
                    borderRadius: "12px",
                    background: "#f6f6f7",
                  }}
                />
              )}

              <s-text color="subdued">{t("requestDetail.decisionModal.templateUnchanged")}</s-text>
            </>
          ) : (
            <s-text color="subdued">{t("requestDetail.decisionModal.noEmail")}</s-text>
          )}

          {releasesHold && (
            <s-text color="subdued">{t("requestDetail.decisionModal.holdReleased")}</s-text>
          )}

          <s-stack direction="inline" gap="base" alignItems="center" justifyContent="end">
            <s-button onClick={() => shopify.modal.hide(DECISION_MODAL_ID)}>
              {t("common.cancel")}
            </s-button>
            <s-button
              variant="primary"
              tone={approve ? "auto" : "critical"}
              loading={deciding || undefined}
              onClick={confirm}
            >
              {confirmLabel}
            </s-button>
          </s-stack>
        </s-stack>
      )}
    </s-modal>
  );
}
