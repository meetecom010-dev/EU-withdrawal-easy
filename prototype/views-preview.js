/* ==========================================================================
   Views: extension previews + interactive customer flow demo
   ========================================================================== */

function deviceToggle(current) {
  return `<div class="seg">
    <button data-device="desktop" class="${current === "desktop" ? "active" : ""}">Desktop</button>
    <button data-device="mobile" class="${current === "mobile" ? "active" : ""}">Mobile</button>
  </div>`;
}
function bindDeviceToggle(root, rerender, ctl) {
  root.querySelectorAll("[data-device]").forEach((b) => b.addEventListener("click", () => {
    ctl.device = b.dataset.device; rerender();
  }));
}

function storeChrome(inner, { url = "nordlys-living.com", mobile = false } = {}) {
  return `
    <div class="device-frame ${mobile ? "mobile" : ""}">
      <div class="df-chrome">
        <span class="df-dots"><i></i><i></i><i></i></span>
        <span class="df-url">${url}</span>
      </div>
      <div class="df-body">${inner}</div>
    </div>`;
}

/* --- Theme app extension preview ------------------------------------------ */

const ThemeCtl = { device: "desktop", tab: "button" };

Views.previewTheme = function (root) {
  const c = ThemeCtl;
  const s = State.settings;

  const footer = `
    <div class="store">
      <div class="store-head"><span class="store-logo">Nordlys</span><span class="store-nav"><span>Shop</span><span>Journal</span><span>About</span></span></div>
      <div class="store-body" style="min-height:90px;display:grid;place-items:center;color:#a5a29b;font-family:var(--font);font-size:12px">— page content —</div>
      <div class="store-foot">
        <span>Shipping</span><span>Contact</span><span>Terms</span><span>Privacy</span>
        <span class="spacer"></span>
        <button class="wd-btn">${I.euro} ${esc(s.labels.buttonLabel)}</button>
      </div>
    </div>`;

  const page = `
    <div class="store">
      <div class="store-head"><span class="store-logo">Nordlys</span><span class="store-nav"><span>Shop</span><span>Journal</span><span>About</span></span></div>
      <div class="store-body">
        <h2>Withdraw from a purchase</h2>
        <p class="store-sub" style="max-width:52ch">EU customers can withdraw from an online purchase within ${s.window.days} days of delivery — no reason needed. Enter your order details to start; no account required.</p>
        <div class="widget" style="margin-top:16px;max-width:420px">
          <div class="w-title" style="font-size:13.5px">Find your order</div>
          <div class="w-sect">Email address</div>
          <input class="input" value="lena.hoffmann@web.de" readonly>
          <div class="w-sect">Order number</div>
          <input class="input" value="#2138" readonly>
          <div class="w-actions"><span class="spacer"></span><button class="btn brand" data-nav="preview-flow">Find order</button></div>
          <p class="w-note">We'll email you a secure link to confirm it's you. You can also use the <a href="#" data-toast="Model form (Annex I B) downloads (demo)">model withdrawal form</a> instead.</p>
        </div>
      </div>
    </div>`;

  root.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div class="ph-text">
          <h1 class="page-title">Theme app extension</h1>
          <p class="page-sub">The storefront withdrawal button and page — the surface that satisfies the 2026 "withdrawal button" rule. Works without customer login.</p>
        </div>
        <div class="page-actions">
          ${deviceToggle(c.device)}
          <button class="btn primary" data-toast="Theme editor opens in Shopify admin (demo)">Add to theme ${I.ext}</button>
        </div>
      </div>
      <div class="tabs" style="margin-bottom:14px">
        <button class="tab ${c.tab === "button" ? "active" : ""}" data-ptab="button">Footer button</button>
        <button class="tab ${c.tab === "page" ? "active" : ""}" data-ptab="page">Withdrawal page</button>
      </div>
      ${storeChrome(c.tab === "button" ? footer : page, { url: c.tab === "button" ? "nordlys-living.com" : "nordlys-living.com/a/withdraw", mobile: c.device === "mobile" })}
      <p class="preview-note">Button label and copy come from Settings → Form & content. ${c.tab === "button" ? "The block can sit in the footer, a menu, or any theme section." : "Customers verify with email + order number — no login, as the directive requires."}</p>
    </div>`;

  bindDeviceToggle(root, () => Views.previewTheme(root), c);
  root.querySelectorAll("[data-ptab]").forEach((b) => b.addEventListener("click", () => { c.tab = b.dataset.ptab; Views.previewTheme(root); }));
  root.querySelectorAll("[data-toast]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); toast(b.dataset.toast); }));
};

/* --- Order status page preview -------------------------------------------- */

const OrderCtl = { device: "desktop" };

Views.previewOrder = function (root) {
  const c = OrderCtl;
  const inner = `
    <div style="font-family:var(--font);background:#f1f1f1;padding:18px">
      <div style="max-width:560px;margin:0 auto">
        <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px">
          <div style="display:flex;gap:10px;align-items:center">
            <span style="width:34px;height:34px;border-radius:99px;background:var(--ok-fill);display:grid;place-items:center;color:var(--ok-ink)">${I.check}</span>
            <div><div style="font-weight:650;font-size:14px">Thank you, Lena!</div><div class="muted small">Order #2138 is confirmed · lena.hoffmann@web.de</div></div>
          </div>
        </div>
        ${renderWidget(State.settings, { step: "details" })}
      </div>
    </div>`;

  root.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div class="ph-text">
          <h1 class="page-title">Order status page form</h1>
          <p class="page-sub">Shown on the order confirmation page and every "view your order" link. Because it appears before fulfillment, most requests here resolve by simply cancelling the order.</p>
        </div>
        <div class="page-actions">
          ${deviceToggle(c.device)}
          <button class="btn primary" data-toast="Checkout settings open in Shopify admin (demo)">Enable in checkout settings ${I.ext}</button>
        </div>
      </div>
      ${storeChrome(inner, { url: "nordlys-living.com/…/orders/2138", mobile: c.device === "mobile" })}
      <p class="preview-note">The form only renders for orders shipping to your eligible countries, inside the withdrawal window. Exempt items are greyed out with the legal reason.</p>
    </div>`;

  bindDeviceToggle(root, () => Views.previewOrder(root), c);
  root.querySelectorAll("[data-toast]").forEach((b) => b.addEventListener("click", () => toast(b.dataset.toast)));
};

/* --- Interactive customer flow demo --------------------------------------- */

const FlowCtl = { step: "lookup", sel: new Map([[0, 1]]), reason: "", declared: false, device: "desktop" };

Views.previewFlow = function (root) {
  const c = FlowCtl;
  const s = State.settings;

  let inner;
  if (c.step === "lookup") {
    inner = `
      <div class="store">
        <div class="store-head"><span class="store-logo">Nordlys</span><span class="store-nav"><span>Shop</span><span>Journal</span><span>About</span></span></div>
        <div class="store-body">
          <h2>Withdraw from a purchase</h2>
          <p class="store-sub" style="max-width:52ch">No reason needed, no account needed. This demo uses sample order ${SAMPLE_ORDER.name}.</p>
          <div class="widget" style="margin-top:16px;max-width:420px">
            <div class="w-title" style="font-size:13.5px">Find your order</div>
            <div class="w-sect">Email address</div>
            <input class="input" value="${SAMPLE_ORDER.email}" readonly>
            <div class="w-sect">Order number</div>
            <input class="input" value="${SAMPLE_ORDER.name}" readonly>
            <div class="w-actions"><span class="spacer"></span><button class="btn brand" data-flow-start>Find order</button></div>
          </div>
        </div>
      </div>`;
  } else {
    inner = `
      <div style="font-family:var(--font);background:#f1f1f1;padding:18px">
        <div style="max-width:560px;margin:0 auto">
          ${renderWidget(s, { step: c.step, sel: c.sel, interactive: true, reason: c.reason })}
        </div>
      </div>`;
  }

  root.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div class="ph-text">
          <h1 class="page-title">Customer flow — try it yourself</h1>
          <p class="page-sub">The full end-to-end experience your customers get. Submitting at the end creates a real request in your Requests tab.</p>
        </div>
        <div class="page-actions">
          ${deviceToggle(c.device)}
          <button class="btn" id="flow-restart">Restart demo</button>
        </div>
      </div>
      ${storeChrome(inner, { url: "nordlys-living.com/a/withdraw", mobile: c.device === "mobile" })}
      <p class="preview-note">${{
        lookup: "Step 0 — customers find their order with just email + order number (accessible without login, as required).",
        details: "Step 1 — pick items and quantities. The engraved vase is exempt (Art. 16(c)) and can't be selected. A reason is never required.",
        confirm: "Step 2 — the unambiguous two-step confirmation the directive requires, with refund estimate and legal declaration.",
        done: "Step 3 — done. An acknowledgement email lands in their inbox immediately, with what happens next.",
      }[c.step]}</p>
    </div>`;

  bindDeviceToggle(root, () => Views.previewFlow(root), c);
  root.querySelector("#flow-restart").addEventListener("click", () => {
    Object.assign(c, { step: "lookup", sel: new Map([[0, 1]]), reason: "", declared: false });
    Views.previewFlow(root);
  });

  root.querySelector("[data-flow-start]")?.addEventListener("click", () => { c.step = "details"; Views.previewFlow(root); });

  /* interactive widget bindings */
  root.querySelectorAll("[data-w-item]").forEach((label) => {
    label.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
      const i = +label.dataset.wItem;
      if (e.target.checked) c.sel.set(i, c.sel.get(i) ?? 1);
      else c.sel.delete(i);
      Views.previewFlow(root);
    });
  });
  root.querySelectorAll("[data-w-qty]").forEach((sel) => {
    sel.addEventListener("click", (e) => e.preventDefault());
    sel.addEventListener("change", (e) => {
      c.sel.set(+sel.dataset.wQty, parseInt(e.target.value, 10));
      Views.previewFlow(root);
    });
  });
  root.querySelector("[data-w-reason]")?.addEventListener("change", (e) => { c.reason = e.target.value; });
  root.querySelector("[data-w-continue]")?.addEventListener("click", () => {
    if (c.sel.size === 0) { toast("Select at least one item", { error: true }); return; }
    c.step = "confirm"; c.declared = false; Views.previewFlow(root);
  });
  root.querySelector("[data-w-back]")?.addEventListener("click", () => { c.step = "details"; Views.previewFlow(root); });
  root.querySelector("[data-w-decl]")?.addEventListener("change", (e) => {
    c.declared = e.target.checked;
    root.querySelector("[data-w-submit]").disabled = !c.declared;
  });
  root.querySelector("[data-w-submit]")?.addEventListener("click", () => {
    if (!c.declared) return;
    const items = [...c.sel.entries()].map(([i, q]) => ({ ...SAMPLE_ORDER.items[i], qty: q }));
    const value = items.reduce((t, it) => t + it.price * it.qty, 0);
    const now = Date.now();
    State.requests.unshift({
      id: `WR-${1100 + State.requests.length}`,
      orderName: SAMPLE_ORDER.name,
      customerName: SAMPLE_ORDER.customer,
      customerEmail: SAMPLE_ORDER.email,
      countryCode: "DE",
      type: "before_fulfillment",
      reason: c.reason,
      comment: "",
      items,
      orderLineCount: SAMPLE_ORDER.items.length,
      value,
      shipping: SAMPLE_ORDER.shipping,
      deduction: 0,
      currency: "EUR",
      status: "pending",
      submittedAt: now,
      decidedAt: null,
      deadlineAt: now + 14 * 86400e3,
      returnDueAt: null,
      repeatCount: 0,
      timeline: [
        { t: now, kind: "brand", title: "Request submitted", meta: "Via storefront withdrawal page (test flow)" },
        { t: now + 60e3, kind: "ok", title: "Acknowledgement email sent", meta: `Confirmation on a durable medium sent to ${SAMPLE_ORDER.email}` },
        { t: now + 90e3, kind: "brand", title: "Fulfillment hold applied", meta: "Order held from shipping while you review" },
      ],
      notes: [],
      tags: ["test-request"],
    });
    State.guide.steps.test = true;
    persist();
    c.step = "done";
    Views.previewFlow(root);
    renderNav();
    toast("Test request created — check the Requests tab", { long: true });
  });
};
