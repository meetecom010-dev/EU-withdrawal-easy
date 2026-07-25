// Back-compat shim. The formatting helpers moved to ../format.js so the live
// email preview (client bundle) can share them with the send path. Existing
// server-side importers keep working through this re-export.
export {
  escapeHtml,
  formatDate,
  formatMoney,
  formatStatus,
  renderItemRows,
} from "../format";
