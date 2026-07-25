/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useEffect, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

export const DECISION_MODAL_ID = "decision-modal";

// The Approve/Reject confirmation modal. It loads the decision email rendered
// with this request's real data, shows a preview, and lets staff edit the exact
// subject/body for this one send (the saved template is untouched). A checkbox
// covers the "decide without emailing" case. Confirming both sets the status and
// sends the reviewed email.
export default function DecisionModal({ decision, preview, loading, deciding, onConfirm }) {
  const shopify = useAppBridge();
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [editing, setEditing] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  // Seed the editable fields whenever a freshly rendered email arrives.
  useEffect(() => {
    if (preview) {
      setSubject(preview.subject ?? "");
      setHtml(preview.html ?? "");
    }
  }, [preview]);

  // Reset the transient controls each time a new decision is opened.
  useEffect(() => {
    setEditing(false);
    setSendEmail(true);
  }, [decision]);

  const approve = decision === "approved";
  const heading = approve ? "Approve withdrawal request" : "Reject withdrawal request";
  const confirmLabel = sendEmail
    ? approve
      ? "Approve & send"
      : "Reject & send"
    : approve
      ? "Approve"
      : "Reject";

  function confirm() {
    onConfirm({ subject, html, sendEmail });
    shopify.modal.hide(DECISION_MODAL_ID);
  }

  return (
    <s-modal id={DECISION_MODAL_ID} heading={heading} size="large">
      {loading || !preview ? (
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-spinner size="base" accessibilityLabel="Loading email preview"></s-spinner>
          <s-text color="subdued">Preparing the customer email…</s-text>
        </s-stack>
      ) : (
        <s-stack direction="block" gap="base">
          <s-checkbox
            label="Send this email to the customer"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.currentTarget.checked)}
          ></s-checkbox>

          {sendEmail ? (
            <>
              <s-text-field
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.currentTarget.value)}
              ></s-text-field>

              <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
                <s-text type="strong">Email body</s-text>
                <s-button variant="tertiary" onClick={() => setEditing((prev) => !prev)}>
                  {editing ? "Preview" : "Edit"}
                </s-button>
              </s-stack>

              {editing ? (
                <textarea
                  value={html}
                  spellCheck={false}
                  onChange={(e) => setHtml(e.currentTarget.value)}
                  aria-label="Email HTML for this send"
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
                  title="Decision email preview"
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

              <s-text color="subdued">
                Edits apply to this email only — your saved template isn&apos;t changed.
              </s-text>
            </>
          ) : (
            <s-text color="subdued">
              No email will be sent to the customer. You can contact them separately if needed.
            </s-text>
          )}

          <s-stack direction="inline" gap="base" alignItems="center" justifyContent="end">
            <s-button onClick={() => shopify.modal.hide(DECISION_MODAL_ID)}>Cancel</s-button>
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
