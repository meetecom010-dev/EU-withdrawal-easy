import { escapeHtml } from "../utils/format.server";

// The shared HTML shell every email renders into. One layout for both
// templates means the header, footer, width, and fonts stay consistent, and a
// new email type only has to supply its body. Styles are inlined because email
// clients strip <style> blocks and don't load external stylesheets.
//
// `preheader` is the grey preview line inbox clients show next to the subject;
// hiding it in the body keeps it out of the visible email while still filling
// that slot.
export function renderLayout({ title, preheader = "", bodyHtml, shopName }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f7;">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden">
      ${escapeHtml(preheader)}
    </span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e1e3e5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
            <tr>
              <td style="padding:20px 28px;border-bottom:1px solid #e1e3e5">
                <span style="font-size:15px;font-weight:600;color:#202223">${escapeHtml(shopName || "EU Withdrawly")}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid #e1e3e5;background:#fafbfb">
                <span style="font-size:12px;color:#6d7175">
                  This email was sent by EU Withdrawly on behalf of ${escapeHtml(shopName || "the store")}.
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// A labelled key/value row used inside the body of both templates.
export function detailRow(label, valueHtml) {
  return `
    <tr>
      <td style="padding:6px 0;font-size:14px;color:#6d7175;width:180px;vertical-align:top">${escapeHtml(label)}</td>
      <td style="padding:6px 0;font-size:14px;color:#202223;vertical-align:top">${valueHtml}</td>
    </tr>`;
}
