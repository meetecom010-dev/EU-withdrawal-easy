import {
  createWithdrawalRequest,
  DuplicateWithdrawalRequestError,
} from "./withdrawal-request.server";
import { runWithdrawalAutomation } from "./withdrawal-automation.server";
import { assertWithdrawalAllowed, WithdrawalNotAllowedError } from "./withdrawal-eligibility.server";
import { FORM_EVENT_TYPES, recordFormEvent } from "./form-events/index.server";
import { adminClientFor } from "./shopify/client.server";
import { fetchOrderForSubmission, normalizeOrderName } from "./shopify/orders.server";

// The full withdrawal-request submission flow, shared by every surface that
// can submit one (today: the order-status extension and the storefront theme
// app extension) — ownership check, deadline check, DB write, funnel event,
// then automation. Returns a plain { status, body } pair so each route's thin
// wrapper just does `Response.json(body, { status })`, whatever its own auth
// mechanism is.
//
// Nothing the browser sends is trusted beyond "which order, which items, why":
//   - the caller must prove the order is theirs — the confirmation number on
//     the order status page, or the order's contact email + order number on
//     the storefront page (the same two facts the lookup step checked);
//   - the customer's name, email, address, order name and every item's title,
//     variant, and price are read from Shopify, never from the request body;
//   - each submitted item must be a real line on the order, and its quantity
//     is capped at what's still on the order.
//
// `surface` is passed straight through to assertWithdrawalAllowed so it
// checks the right per-surface enable flag; omit it for the order-status
// page's default behavior.

const ORDER_GID = /^gid:\/\/shopify\/Order\/\d+$/;
const MAX_ITEMS = 100;
const MAX_REASON_LENGTH = 1000;

function badRequest(code, error) {
  return { status: 400, body: { error, code } };
}

// Deliberately the same answer for "no such order" and "not your order", so
// the endpoint can't be used to learn which orders exist.
const ORDER_NOT_FOUND = {
  status: 404,
  body: { error: "We couldn't find an order matching those details.", code: "order_not_found" },
};

function clampText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function ownsOrder(order, body, surface) {
  if (surface === "standalone_page") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const orderName = normalizeOrderName(body.orderNumber);
    return (
      Boolean(email) &&
      Boolean(orderName) &&
      email === order.email.trim().toLowerCase() &&
      orderName === order.name
    );
  }
  const confirmationNumber = typeof body.confirmationNumber === "string" ? body.confirmationNumber : "";
  return Boolean(order.confirmationNumber) && confirmationNumber === order.confirmationNumber;
}

// Maps each submitted item onto a real order line: by variant (the id the
// order status extension has), then by LineItem id (what the storefront page
// submits), then — for custom line items with no variant — by title. Units are
// claimed per line so two submitted items can't both take the same units.
// Returns null if any item isn't on the order at all (a forged request). An
// item that is on the order but has no units left (removed or refunded) is
// skipped rather than failing the customer's whole request.
function resolveItems(submittedItems, orderLines) {
  const claimed = new Map();
  const byLine = new Map();

  for (const submitted of submittedItems) {
    if (!submitted || typeof submitted !== "object") return null;
    const variantId = typeof submitted.variantId === "string" ? submitted.variantId : "";
    const lineId = typeof submitted.lineId === "string" ? submitted.lineId : "";
    const title = typeof submitted.title === "string" ? submitted.title : "";

    const free = (line) => line.quantity - (claimed.get(line.id) ?? 0);
    const candidates = [
      ...(variantId ? orderLines.filter((line) => line.variantId === variantId) : []),
      ...orderLines.filter((line) => lineId && line.id === lineId),
      ...orderLines.filter((line) => !line.variantId && title && line.title === title),
    ];
    if (candidates.length === 0) return null;
    const line = candidates.find((candidate) => free(candidate) > 0);
    if (!line) continue;

    const requested = Math.floor(Number(submitted.quantity));
    const quantity = Math.min(Number.isFinite(requested) && requested > 0 ? requested : 1, free(line));
    claimed.set(line.id, (claimed.get(line.id) ?? 0) + quantity);

    // The same line submitted twice becomes one item, so each stored item
    // stands for exactly one order line.
    const existing = byLine.get(line.id);
    if (existing) {
      existing.quantity += quantity;
      continue;
    }
    byLine.set(line.id, { line, quantity });
  }

  return [...byLine.values()].map(({ line, quantity }) => ({
    // The order's own LineItem id, so every later lookup that falls back to
    // the line id (holds, returns, the shipping badge) finds this line.
    lineId: line.id,
    variantId: line.variantId ?? "",
    title: line.title,
    variantTitle: line.variantTitle,
    sku: line.sku,
    imageUrl: line.imageUrl,
    quantity,
    // The total for the withdrawn units, in the customer's currency — the
    // same meaning on every surface, so request totals add up correctly.
    price: line.unitPrice
      ? {
          amount: Math.round(line.unitPrice.amount * quantity * 100) / 100,
          currencyCode: line.unitPrice.currencyCode,
        }
      : null,
  }));
}

export async function submitWithdrawalRequestFlow(shop, body, { surface } = {}) {
  if (
    typeof body?.orderId !== "string" ||
    !ORDER_GID.test(body.orderId) ||
    !Array.isArray(body.items) ||
    body.items.length === 0 ||
    body.items.length > MAX_ITEMS
  ) {
    return badRequest("bad_request", "orderId and at least one item are required");
  }

  const admin = await adminClientFor(shop);
  const order = await fetchOrderForSubmission(admin, body.orderId);
  if (!order || !ownsOrder(order, body, surface)) {
    return ORDER_NOT_FOUND;
  }

  // The deadline is enforced here, not on the client. The client can be
  // replayed with an expired order, and the settings that define the window
  // are deliberately never sent to the storefront.
  try {
    await assertWithdrawalAllowed(shop, order.id, { surface });
  } catch (error) {
    if (error instanceof WithdrawalNotAllowedError) {
      return { status: 422, body: { error: error.message, code: error.code, expiresAt: error.expiresAt ?? null } };
    }
    throw error;
  }

  const items = resolveItems(body.items, order.lineItems);
  if (!items || items.length === 0) {
    return badRequest("invalid_items", "The selected items aren't on this order.");
  }

  // Record which surface this came from, derived from the calling route's
  // `surface` (never the client) so the admin can show where a request
  // originated. Anything that isn't the theme app extension's standalone page
  // is the order status page.
  const source = surface === "standalone_page" ? "standalone_page" : "order_status";
  const clientCountry = typeof body.countryCode === "string" && /^[A-Z]{2}$/.test(body.countryCode)
    ? body.countryCode
    : "";

  let withdrawalRequest;
  try {
    withdrawalRequest = await createWithdrawalRequest(shop, {
      orderId: order.id,
      orderName: order.name,
      // The order's own customer. The storefront visitor's typed name is only
      // a fallback for an order with no name on it at all.
      customerName: order.customerName || clampText(body.customerName, 200),
      customerEmail: order.email,
      countryCode: order.countryCode || clientCountry,
      locale: clampText(body.locale, 20),
      shippingAddress: order.shippingAddress,
      reason: clampText(body.reason, MAX_REASON_LENGTH),
      // Lines still on the order — compared against items.length to tell a
      // full withdrawal (shipping refunded too) from a partial one.
      orderLineCount: order.lineItems.filter((line) => line.quantity > 0).length,
      source,
      items,
    });
  } catch (error) {
    if (error instanceof DuplicateWithdrawalRequestError) {
      return {
        status: 409,
        body: {
          error: "A withdrawal request for this order is already being reviewed.",
          code: "duplicate_request",
        },
      };
    }
    throw error;
  }

  // The submission point in the funnel. Carries sessionId so it links to the
  // button_viewed / form_opened events the client emitted before a request
  // existed. Recorded before the automation runs, which streams its own events.
  await recordFormEvent(shop, withdrawalRequest.orderId, {
    type: FORM_EVENT_TYPES.FORM_SUBMITTED,
    status: "ok",
    withdrawalRequestId: withdrawalRequest.id,
    sessionId: typeof body.sessionId === "string" ? body.sessionId.slice(0, 100) : null,
    message: "Customer submitted the withdrawal form",
  });

  // Run the automation inline so a hold lands within seconds rather than
  // waiting for the next cron tick. It never throws — failures are recorded on
  // the request for staff — so the customer's submission is acknowledged
  // either way.
  await runWithdrawalAutomation(shop, withdrawalRequest.id);

  // Only what a customer-facing surface needs — the automation log, staff
  // notes, and hold details stay in the admin.
  return {
    status: 201,
    body: {
      withdrawalRequest: {
        id: withdrawalRequest.id,
        status: withdrawalRequest.status,
        submittedAt: withdrawalRequest.submittedAt,
      },
    },
  };
}
