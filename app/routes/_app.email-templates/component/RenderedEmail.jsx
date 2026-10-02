/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";

// Renders a finished email HTML string inside an isolated <iframe> so the
// email's own inlined styles can't leak into (or be affected by) the admin
// page — what you see is what lands in the inbox.
export default function RenderedEmail({ html, height = "600px" }) {
  const { t } = useTranslation();
  return (
    <iframe
      title={t("emailTemplates.body.previewHeading")}
      srcDoc={html}
      // No scripts: the HTML is merchant-edited and must not run in the app.
      sandbox="allow-same-origin allow-popups"
      style={{
        width: "100%",
        height,
        border: "1px solid #e1e3e5",
        borderRadius: "12px",
        background: "#f6f6f7",
      }}
    />
  );
}
