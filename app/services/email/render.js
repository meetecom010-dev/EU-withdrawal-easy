// Turns a saved template config (subject + Liquid HTML body) plus request data
// into the final { subject, html } to send. The exact same function powers the
// Email Templates preview and the real send path, so what a merchant previews
// is what the recipient receives.
//
// The body is the merchant's own HTML — rendered as-is — with {{ liquid.paths }}
// filled in and HTML-escaped (see applyLiquid). There are no locked blocks: the
// merchant controls the whole template, matching Shopify's notification editor.

import { applyLiquid, applyLiquidText, buildLiquidData } from "./variables";

export function renderEmailTemplate(config, vars) {
  const data = buildLiquidData(vars);
  return {
    subject: applyLiquidText(config.subject, data),
    html: applyLiquid(config.bodyHtml, data),
  };
}
