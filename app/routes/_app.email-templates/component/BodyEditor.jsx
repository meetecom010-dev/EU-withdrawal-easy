/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useRef, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { applyLiquid, SAMPLE_LIQUID_DATA } from "../../../services/email/variables";
import VariablePanel from "./VariablePanel";
import RenderedEmail from "./RenderedEmail";

const PREVIEW_MODAL_ID = "email-preview-modal";

// The email body section, modelled on Shopify's notification editor: a rendered
// HTML preview by default, with "Edit code" flipping to a raw HTML/Liquid code
// editor with the variable panel beside it. A separate "Preview" button opens
// the email in a modal with sample data. The body is the merchant's own HTML —
// stored and sent verbatim, with {{ liquid }} filled in at send time.
export default function BodyEditor({ value, onChange, error, onFocus }) {
  const shopify = useAppBridge();
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef(null);

  // Preview always uses sample data so the merchant sees a realistic email.
  const previewHtml = applyLiquid(value, SAMPLE_LIQUID_DATA);

  // Inserts a Liquid tag at the caret of the code editor, restoring the caret
  // after React re-renders the controlled textarea. Falls back to appending if
  // the textarea isn't mounted.
  function insertVariable(token) {
    const snippet = `{{ ${token} }}`;
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value || ""}${snippet}`);
      return;
    }
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? start;
    onChange(value.slice(0, start) + snippet + value.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      const caret = start + snippet.length;
      try {
        textarea.setSelectionRange(caret, caret);
      } catch {
        /* setSelectionRange can throw on unsupported inputs — safe to ignore */
      }
    });
  }

  return (
    <s-stack direction="block" gap="small-300">
      <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
        <s-text type="strong">Email body</s-text>
        <s-stack direction="inline" gap="small-200" alignItems="center">
          <s-button variant="tertiary" onClick={() => shopify.modal.show(PREVIEW_MODAL_ID)}>
            Preview
          </s-button>
          <s-button variant="secondary" onClick={() => setEditing((prev) => !prev)}>
            {editing ? "Done" : "Edit code"}
          </s-button>
        </s-stack>
      </s-stack>

      {error && <s-text tone="critical">{error}</s-text>}

      {editing ? (
        <s-query-container>
          <s-grid
            gridTemplateColumns="@container (inline-size > 720px) 2fr 1fr, 1fr"
            gap="base"
            alignItems="start"
          >
            <textarea
              ref={textareaRef}
              value={value}
              spellCheck={false}
              onChange={(event) => onChange(event.currentTarget.value)}
              onFocus={onFocus}
              aria-label="Email HTML body"
              style={{
                width: "100%",
                minHeight: "440px",
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
            <VariablePanel onInsert={insertVariable} />
          </s-grid>
        </s-query-container>
      ) : (
        <RenderedEmail html={previewHtml} />
      )}

      <s-modal id={PREVIEW_MODAL_ID} heading="Email preview" size="large">
        <RenderedEmail html={previewHtml} height="70vh" />
      </s-modal>
    </s-stack>
  );
}
