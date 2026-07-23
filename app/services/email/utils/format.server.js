// Formatting helpers shared by the email templates. Pure functions, no I/O —
// kept separate so template files stay declarative and these can be unit
// tested on their own.

// Every dynamic value passes through here before landing in HTML. Customer
// names, reasons, and product titles are attacker-influenced (a customer types
// them), so escaping is mandatory, not cosmetic.
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function formatMoney(price) {
  if (!price || price.amount == null || !price.currencyCode) return "";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: price.currencyCode,
    }).format(Number(price.amount));
  } catch {
    // Unknown/invalid currency code — fall back to a plain amount rather than
    // throwing inside a template.
    return `${price.amount} ${price.currencyCode}`;
  }
}

const STATUS_LABEL = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

export function formatStatus(status) {
  return STATUS_LABEL[status] ?? "Pending review";
}

// Renders the selected products as table rows. Shared by both templates so the
// customer and merchant see the same itemisation.
export function renderItemRows(items = []) {
  if (items.length === 0) {
    return `<tr><td style="padding:8px 0;color:#6d7175;font-size:14px">No items listed.</td></tr>`;
  }
  return items
    .map((item) => {
      const qty = item.quantity ?? 1;
      const price = formatMoney(item.price);
      const sku = item.sku ? ` &middot; ${escapeHtml(item.sku)}` : "";
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e1e3e5;font-size:14px;color:#202223">
            ${escapeHtml(item.title)}${sku}
            <span style="color:#6d7175"> &times; ${qty}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #e1e3e5;font-size:14px;color:#202223;text-align:right;white-space:nowrap">
            ${escapeHtml(price)}
          </td>
        </tr>`;
    })
    .join("");
}
