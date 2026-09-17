/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */

// Renders a finished email HTML string inside an isolated <iframe> so the
// email's own inlined styles can't leak into (or be affected by) the admin
// page — what you see is what lands in the inbox.
export default function RenderedEmail({ html, height = "600px" }) {
  return (
    <iframe
      title="Email preview"
      srcDoc={html}
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
