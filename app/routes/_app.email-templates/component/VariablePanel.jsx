/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { EMAIL_VARIABLE_GROUPS } from "../../../services/email/variables";

// The grouped list of Liquid variables shown beside the code editor. Clicking
// one inserts it at the cursor (handled by the parent). Rendered as a compact,
// scrollable card the same height as the editor: tight category groups, small
// monospace rows, so the whole set is easy to scan without taking much space.
// The native span carries a hover description since s-clickable has no title.
const TOKEN_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export default function VariablePanel({ onInsert }) {
  return (
    <div
      style={{
        height: "440px",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #e1e3e5",
        borderRadius: "12px",
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 14px 8px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#202223" }}>Variables</div>
        <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "2px", lineHeight: 1.4 }}>
          Click to insert at your cursor.
        </div>
      </div>

      <div style={{ overflow: "auto", flex: 1, padding: "0 8px 10px" }}>
        {EMAIL_VARIABLE_GROUPS.map((group) => (
          <div key={group.category} style={{ marginTop: "10px" }}>
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#8c9196",
                padding: "0 6px 3px",
              }}
            >
              {group.category}
            </div>
            {group.variables.map((variable) => (
              <span key={variable.token} title={variable.description} style={{ display: "block" }}>
                <s-clickable
                  onClick={() => onInsert(variable.token)}
                  accessibilityLabel={`Insert ${variable.label}: ${variable.description}`}
                >
                  <div style={{ padding: "3px 6px", borderRadius: "6px" }}>
                    <span
                      style={{
                        fontFamily: TOKEN_FONT,
                        fontSize: "12px",
                        color: "#2c6ecb",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {`{{ ${variable.token} }}`}
                    </span>
                  </div>
                </s-clickable>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
