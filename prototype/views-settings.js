/* ==========================================================================
   Views: settings (tabbed) + shared customer widget renderer
   ========================================================================== */

/* Sample order used by previews. Item 3 is exempt to demo eligibility. */
const SAMPLE_ORDER = {
  name: "#2138",
  customer: "Lena Hoffmann",
  email: "lena.hoffmann@web.de",
  shipping: 4.9,
  items: [
    { title: "Fjord Table Lamp — Oak", sku: "NL-LAMP-01", price: 89, qty: 1, emoji: "\u{1F4A1}" },
    { title: "Tind Candle Holder Set", sku: "NL-CNDL-11", price: 27, qty: 2, emoji: "\u{1F56F}️" },
    { title: "Alva Linen Cushion 50×50", sku: "NL-CUSH-14", price: 34, qty: 1, emoji: "\u{1F6CB}️" },
    { title: "Brygge Vase — engraved", sku: "NL-VASE-07E", price: 64, qty: 1, emoji: "\u{1F3FA}", exempt: "Personalized — can't be returned (Art. 16(c))" },
  ],
};

/* Renders the customer-facing withdrawal widget.
   step: details | confirm | done. sel: Map(itemIndex -> qty). */
function renderWidget(s, { step = "details", sel = new Map([[0, 1], [1, 2]]), interactive = false, reason = "" } = {}) {
  const L = s.labels;
  const stepNum = { details: 1, confirm: 2, done: 3 }[step];
  const items = SAMPLE_ORDER.items;
  const selItems = [...sel.entries()].map(([i, q]) => ({ ...items[i], qty: q }));
  const itemsTotal = selItems.reduce((t, it) => t + it.price * it.qty, 0);
  const shipRefund = s.returns.refundStandardShipping ? SAMPLE_ORDER.shipping : 0;

  const steps = `<div class="w-steps">${[1, 2, 3].map((n) => `<i class="${n <= stepNum ? "on" : ""}"></i>`).join("")}</div>`;

  if (step === "done") {
    return `<div class="widget">${steps}
      <div class="w-done">
        <div class="wd-icon">${I.check}</div>
        <div class="w-title">${esc(L.doneTitle)}</div>
        <p class="w-desc" style="margin:6px auto 0;max-width:46ch">${esc(L.doneMessage)}</p>
      </div>
      <div class="w-next">
        <div class="wn-row"><b>Now</b><span>Confirmation email sent to ${esc(SAMPLE_ORDER.email)} · Ref ${SAMPLE_ORDER.name}</span></div>
        <div class="wn-row"><b>Next</b><span>${esc(s.emails.branding.fromName)} reviews your request (within 14 days at most)</span></div>
        <div class="wn-row"><b>Then</b><span>Your refund of ${fmtMoney(itemsTotal + shipRefund)} goes back to your original payment method</span></div>
      </div>
    </div>`;
  }

  if (step === "confirm") {
    return `<div class="widget">${steps}
      <div class="w-title">${esc(L.confirmHeading)}</div>
      <p class="w-desc">Order ${SAMPLE_ORDER.name} · ${SAMPLE_ORDER.customer}</p>
      <div class="w-sect">Withdrawing ${selItems.length} item${selItems.length === 1 ? "" : "s"}</div>
      ${selItems.map((it) => `
        <div class="w-item" style="cursor:default">
          <span class="wi-thumb">${it.emoji}</span>
          <span class="wi-body"><span class="wi-title">${esc(it.title)}</span><br><span class="wi-sub">Qty ${it.qty}</span></span>
          <span class="wi-price">${fmtMoney(it.price * it.qty)}</span>
        </div>`).join("")}
      ${reason ? `<p class="w-note">Reason: ${esc(reason)}</p>` : ""}
      <div class="w-summary">
        <div class="ws-row"><span>Items</span><span class="num">${fmtMoney(itemsTotal)}</span></div>
        <div class="ws-row"><span>Standard shipping refund</span><span class="num">${shipRefund ? fmtMoney(shipRefund) : "—"}</span></div>
        <div class="ws-row total"><span>Estimated refund</span><span class="num">${fmtMoney(itemsTotal + shipRefund)}</span></div>
        <div class="ws-row" style="color:var(--sub)"><span>Return shipping</span><span>${s.returns.shippingPayer === "customer" ? "Paid by you (if the order has shipped)" : "Free — paid by us"}</span></div>
      </div>
      <label class="w-decl"><input type="checkbox" data-w-decl ${interactive ? "" : "checked"}><span>${esc(L.declaration)}</span></label>
      <div class="w-actions">
        <button class="btn" data-w-back>Back</button>
        <span class="spacer"></span>
        <button class="btn brand" data-w-submit ${interactive ? "disabled" : ""}>${esc(L.confirmLabel)}</button>
      </div>
      <p class="w-note">You'll receive an email confirmation immediately (required by EU law).</p>
    </div>`;
  }

  return `<div class="widget">${steps}
    <div class="w-title">${esc(L.title)}</div>
    <p class="w-desc">${esc(L.description)}</p>
    <div class="w-sect">${esc(L.itemHeading)}</div>
    ${items.map((it, i) => it.exempt ? `
      <div class="w-item blocked" aria-disabled="true">
        <input type="checkbox" disabled>
        <span class="wi-thumb" style="opacity:.6">${it.emoji}</span>
        <span class="wi-body"><span class="wi-title" style="color:var(--sub)">${esc(it.title)}</span><br><span class="wi-note">${esc(it.exempt)}</span></span>
        <span class="wi-price" style="color:var(--sub)">${fmtMoney(it.price * it.qty)}</span>
      </div>` : `
      <label class="w-item ${sel.has(i) ? "sel" : ""}" data-w-item="${i}">
        <input type="checkbox" ${sel.has(i) ? "checked" : ""} aria-label="Select ${esc(it.title)}">
        <span class="wi-thumb">${it.emoji}</span>
        <span class="wi-body"><span class="wi-title">${esc(it.title)}</span><br><span class="wi-sub">${fmtMoney(it.price)} each</span></span>
        ${it.qty > 1 ? `
          <select class="wi-qty" data-w-qty="${i}" aria-label="Quantity to return" ${sel.has(i) ? "" : "disabled"}>
            ${Array.from({ length: it.qty }, (_, q) => `<option value="${q + 1}" ${sel.get(i) === q + 1 ? "selected" : ""}>${q + 1} of ${it.qty}</option>`).join("")}
          </select>` : `<span class="wi-sub">Qty 1</span>`}
      </label>`).join("")}
    ${s.form.reason.enabled ? `
      <div class="w-sect">${esc(s.form.reason.label)}</div>
      <select class="select" data-w-reason style="max-width:280px;height:32px">
        <option value="">Choose (optional)…</option>
        ${s.form.reason.options.map((o) => `<option ${o === reason ? "selected" : ""}>${esc(o)}</option>`).join("")}
      </select>` : ""}
    ${s.form.comment.enabled ? `
      <div class="w-sect">${esc(s.form.comment.label)}</div>
      <textarea class="input" rows="2" placeholder="Optional" style="min-height:52px"></textarea>` : ""}
    ${s.form.iban.enabled ? `
      <div class="w-sect">${esc(s.form.iban.label)}</div>
      <input class="input" placeholder="DE00 0000 0000 0000 0000 00" style="max-width:280px">` : ""}
    <div class="w-actions">
      <span class="w-note" style="margin:0">${sel.size} selected · ${fmtMoney(itemsTotal)}</span>
      <span class="spacer"></span>
      <button class="btn brand" data-w-continue ${interactive && sel.size === 0 ? "disabled" : ""}>${esc(L.continueLabel)}</button>
    </div>
  </div>`;
}

/* ==========================================================================
   Settings controller
   ========================================================================== */

const SettingsCtl = { draft: null, tab: "general", previewStep: "details", emailEdit: null };

function settingsDirty() {
  return JSON.stringify(SettingsCtl.draft) !== JSON.stringify(State.settings);
}
function setPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
  cur[keys[keys.length - 1]] = value;
}
function getPath(obj, path) {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}
function settingsErrors(d) {
  const errs = {};
  if (!(d.window.days >= 14)) errs["window.days"] = "EU law requires at least 14 days.";
  if (d.window.days > 365) errs["window.days"] = "Maximum 365 days.";
  if (d.form.reason.enabled && d.form.reason.options.filter((o) => o.trim()).length === 0) errs["reason.options"] = "Add at least one reason, or turn the field off.";
  if (d.countryMode === "custom" && d.countries.length === 0) errs["countries"] = "Select at least one country, or choose all EU countries.";
  const fb = d.automation.beforeShip.fallbackDays;
  if (d.automation.beforeShip.hold && !(fb >= 1 && fb <= 14)) errs["fallbackDays"] = "Between 1 and 14 days.";
  if (!(d.returns.returnDays >= 14)) errs["returnDays"] = "Customers must get at least 14 days to send goods back.";
  return errs;
}

Views.settings = function (root, params) {
  if (!SettingsCtl.draft) SettingsCtl.draft = structuredClone(State.settings);
  if (params?.tab) SettingsCtl.tab = params.tab;
  const d = SettingsCtl.draft;
  const errs = settingsErrors(d);
  const tab = SettingsCtl.tab;

  const tabs = [
    ["general", "General"], ["eligibility", "Eligibility"], ["returns", "Returns & refunds"],
    ["form", "Form & content"], ["automation", "Automation"], ["emails", "Emails"], ["compliance", "Compliance"],
  ];

  root.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div class="ph-text">
          <h1 class="page-title">Settings</h1>
          <p class="page-sub">Your withdrawal policy, the customer-facing form, and what happens after each request.</p>
        </div>
      </div>
      <div class="tabs" style="margin-bottom:14px">
        ${tabs.map(([k, l]) => `<button class="tab ${tab === k ? "active" : ""}" data-stab="${k}">${l}</button>`).join("")}
      </div>
      <div id="settings-body"></div>
    </div>`;

  const body = root.querySelector("#settings-body");
  const render = {
    general: renderGeneral, eligibility: renderEligibility, returns: renderReturns,
    form: renderForm, automation: renderAutomation, emails: renderEmails, compliance: renderCompliance,
  }[tab];
  render(body, d, errs);

  root.querySelectorAll("[data-stab]").forEach((b) => b.addEventListener("click", () => {
    SettingsCtl.tab = b.dataset.stab; SettingsCtl.emailEdit = null; Views.settings(root);
  }));

  syncSaveBar(root);

  /* generic two-way binding for [data-set] controls */
  root.querySelectorAll("[data-set]").forEach((el) => {
    const path = el.dataset.set;
    const evt = ["checkbox", "radio", "number", "color"].includes(el.type) || el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, () => {
      let v;
      if (el.type === "checkbox") v = el.checked;
      else if (el.type === "number") v = el.value === "" ? "" : Number(el.value);
      else v = el.value;
      setPath(d, path, v);
      if (el.dataset.rerender != null) Views.settings(root);
      else { syncSaveBar(root); refreshPreview(root, d); refreshEmailPreview(root, d); }
    });
  });
};

function syncSaveBar(root) {
  if (settingsDirty()) {
    showSaveBar({
      onSave() {
        const errs = settingsErrors(SettingsCtl.draft);
        if (Object.keys(errs).length) {
          toast(Object.values(errs)[0], { error: true });
          Views.settings(root);
          return;
        }
        State.settings = structuredClone(SettingsCtl.draft);
        persist(); hideSaveBar(); toast("Settings saved");
        Views.settings(root); renderNav();
      },
      onDiscard() {
        SettingsCtl.draft = structuredClone(State.settings);
        hideSaveBar(); Views.settings(root);
        toast("Changes discarded");
      },
    });
  } else {
    hideSaveBar();
  }
}

function refreshPreview(root, d) {
  const slot = root.querySelector("#form-preview-slot");
  if (slot) slot.innerHTML = renderWidget(d, { step: SettingsCtl.previewStep });
}
function refreshEmailPreview(root, d) {
  const slot = root.querySelector("#email-preview-slot");
  if (slot && SettingsCtl.emailEdit) {
    slot.innerHTML = emailPreview(d.emails.templates[SettingsCtl.emailEdit], d.emails.branding);
  }
}

/* --- General -------------------------------------------------------------- */

function renderGeneral(el, d) {
  el.innerHTML = `
    <div class="stack" style="max-width:44rem">
      <div class="card">
        <div class="toggle-row">
          <label class="switch"><input type="checkbox" data-set="enabled" data-rerender ${d.enabled ? "checked" : ""}><span class="knob"></span></label>
          <div class="tr-text">
            <div class="tr-title">Withdrawal function ${d.enabled ? '<span class="badge ok">Live</span>' : '<span class="badge crit">Off</span>'}</div>
            <div class="tr-sub">The master switch. When off, no withdrawal surfaces are shown — your shop may not meet the 2026 EU withdrawal-button requirement.</div>
          </div>
        </div>
        ${!d.enabled ? `<div style="margin-top:8px">${banner("warn", "Customers can't withdraw while this is off", "EU shops must offer an electronic withdrawal function since 19 June 2026.")}</div>` : ""}
      </div>

      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Where it appears</h2><p class="card-sub">Each surface can be turned on independently and previewed before publishing.</p></div></div>
        ${[
          ["surfaces.themeButton", "Storefront withdrawal button", "Theme app block, usually in the footer — visible without login.", "preview-theme"],
          ["surfaces.themePage", "Standalone withdrawal page", "yourstore.com/a/withdraw — customers verify with email + order number.", "preview-theme"],
          ["surfaces.orderStatus", "Order status page form", "Pre-filled form right after checkout; supports withdrawing before shipping.", "preview-order"],
          ["surfaces.checkout", "Checkout notice", "A one-line mention of the 14-day right at checkout (Plus feature in Shopify).", "preview-order"],
        ].map(([path, t, sub, prev]) => `
          <div class="toggle-row">
            <label class="switch"><input type="checkbox" data-set="${path}" ${getPath(d, path) ? "checked" : ""}><span class="knob"></span></label>
            <div class="tr-text"><div class="tr-title">${t}</div><div class="tr-sub">${sub}</div></div>
            <button class="btn sm" data-nav="${prev}">Preview</button>
          </div>`).join("")}
      </div>

      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Form languages</h2><p class="card-sub">The form follows the customer's language; English is the fallback. Texts are editable per language under Form & content.</p></div></div>
        <div class="chips" id="set-langs">
          ${LANGUAGES.map(([code, name]) => `<button class="chip ${d.languages.includes(code) ? "on" : ""}" data-lang="${code}" ${code === "en" ? "disabled" : ""}>${name}${code === "en" ? " (default)" : ""}</button>`).join("")}
        </div>
      </div>
    </div>`;

  el.querySelectorAll("#set-langs .chip:not([disabled])").forEach((chip) => chip.addEventListener("click", () => {
    const lang = chip.dataset.lang;
    d.languages = d.languages.includes(lang) ? d.languages.filter((c) => c !== lang) : [...d.languages, lang];
    chip.classList.toggle("on");
    syncSaveBar(document.getElementById("content"));
  }));
}

/* --- Eligibility ----------------------------------------------------------- */

function renderEligibility(el, d, errs) {
  el.innerHTML = `
    <div class="stack" style="max-width:44rem">
      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Withdrawal window</h2><p class="card-sub">The clock starts on delivery for goods (Art. 9). Requests outside the window are blocked in the form with a clear explanation.</p></div></div>
        <div class="cols cols-half">
          <div class="field">
            <label for="set-days">Days after delivery</label>
            <input id="set-days" class="input ${errs["window.days"] ? "invalid" : ""}" type="number" min="14" max="365" data-set="window.days" data-rerender value="${d.window.days}">
            ${errs["window.days"] ? `<span class="err">${I.warn} ${errs["window.days"]}</span>` : `<span class="hint">14 is the legal minimum — offering more is a common trust signal.</span>`}
          </div>
          <div class="field">
            <label for="set-transit">Estimated transit days</label>
            <input id="set-transit" class="input" type="number" min="0" max="30" data-set="window.transitDays" value="${d.window.transitDays}">
            <span class="hint">Fallback delivery estimate when the carrier doesn't confirm delivery.</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Eligible countries</h2><p class="card-sub">Customers outside these countries won't see withdrawal surfaces.</p></div></div>
        <div class="choice-list" style="margin-bottom:8px">
          <label class="choice"><input type="radio" name="cmode" value="all" data-set="countryMode" data-rerender ${d.countryMode === "all" ? "checked" : ""}><span><span class="ch-title"><b>All 27 EU countries</b> (recommended)</span></span></label>
          <label class="choice"><input type="radio" name="cmode" value="custom" data-set="countryMode" data-rerender ${d.countryMode === "custom" ? "checked" : ""}><span><span class="ch-title">Only specific countries</span></span></label>
        </div>
        ${d.countryMode === "custom" ? `
          <div class="chips" id="set-countries">
            ${EU_COUNTRIES.map(([code, name]) => `<button class="chip ${d.countries.includes(code) ? "on" : ""}" data-cc="${code}">${flag(code)} ${name}</button>`).join("")}
          </div>
          ${errs["countries"] ? `<span class="err" style="display:flex;margin-top:8px">${I.warn} ${errs["countries"]}</span>` : ""}` : ""}
      </div>

      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Exempt products</h2><p class="card-sub">Art. 16 lists goods the right of withdrawal doesn't cover. Exempt items appear greyed out in the form with the legal reason — customers can't select them.</p></div></div>
        ${[
          ["eligibility.categories.personalized", "Custom-made or personalized goods", "Art. 16(c) — engraving, made-to-measure, printed-to-order."],
          ["eligibility.categories.hygiene", "Sealed hygiene goods once unsealed", "Art. 16(e) — cosmetics, earrings, underwear with hygiene seals."],
          ["eligibility.categories.perishable", "Goods that expire or perish quickly", "Art. 16(d) — food, flowers, short-dated products."],
          ["eligibility.categories.digital", "Digital content after download starts", "Art. 16(m) — requires the customer's express consent at checkout."],
        ].map(([path, t, sub]) => `
          <div class="toggle-row">
            <label class="switch"><input type="checkbox" data-set="${path}" ${getPath(d, path) ? "checked" : ""}><span class="knob"></span></label>
            <div class="tr-text"><div class="tr-title">${t}</div><div class="tr-sub">${sub}</div></div>
          </div>`).join("")}
        <hr class="divider">
        <div class="field">
          <span class="lbl">Product tags that mark an item exempt</span>
          <span class="hint" style="margin-bottom:6px">Tag products in Shopify (e.g. <b>personalized</b>) and they're automatically excluded from withdrawal.</span>
          <div class="chips" id="exempt-tags">
            ${d.eligibility.exemptTags.map((t) => `<span class="tag">${esc(t)}<button data-deltag="${esc(t)}" aria-label="Remove ${esc(t)}">${I.x}</button></span>`).join("")}
          </div>
          <div class="input-row" style="max-width:280px;margin-top:8px">
            <input class="input" id="exempt-tag-input" placeholder="Add a product tag…" style="height:28px">
            <button class="btn sm" id="exempt-tag-add">Add</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Order types</h2><p class="card-sub">The distance-selling rules only apply to online orders.</p></div></div>
        <div class="toggle-row">
          <label class="switch"><input type="checkbox" data-set="eligibility.excludePOS" ${d.eligibility.excludePOS ? "checked" : ""}><span class="knob"></span></label>
          <div class="tr-text"><div class="tr-title">Exclude POS (in-person) orders</div><div class="tr-sub">The right of withdrawal doesn't apply to purchases made in a physical store.</div></div>
        </div>
        <div class="toggle-row">
          <label class="switch"><input type="checkbox" data-set="eligibility.excludeB2B" ${d.eligibility.excludeB2B ? "checked" : ""}><span class="knob"></span></label>
          <div class="tr-text"><div class="tr-title">Exclude B2B orders</div><div class="tr-sub">Consumer rights don't cover business purchases. Detected via Shopify B2B customer profiles.</div></div>
        </div>
      </div>
    </div>`;

  el.querySelectorAll("#set-countries .chip").forEach((chip) => chip.addEventListener("click", () => {
    const cc = chip.dataset.cc;
    d.countries = d.countries.includes(cc) ? d.countries.filter((c) => c !== cc) : [...d.countries, cc];
    chip.classList.toggle("on");
    syncSaveBar(document.getElementById("content"));
  }));
  el.querySelector("#exempt-tag-add")?.addEventListener("click", addExemptTag);
  el.querySelector("#exempt-tag-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") addExemptTag(); });
  function addExemptTag() {
    const input = el.querySelector("#exempt-tag-input");
    const t = input.value.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t) return;
    if (!d.eligibility.exemptTags.includes(t)) d.eligibility.exemptTags.push(t);
    Views.settings(document.getElementById("content"));
  }
  el.querySelectorAll("[data-deltag]").forEach((b) => b.addEventListener("click", () => {
    d.eligibility.exemptTags = d.eligibility.exemptTags.filter((t) => t !== b.dataset.deltag);
    Views.settings(document.getElementById("content"));
  }));
}

/* --- Returns & refunds ------------------------------------------------------ */

function renderReturns(el, d, errs) {
  const r = d.returns;
  el.innerHTML = `
    <div class="stack" style="max-width:44rem">
      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Return shipping</h2><p class="card-sub">Customers only pay return shipping if you told them before purchase — the form and emails state this automatically.</p></div></div>
        <div class="choice-list">
          <label class="choice boxed ${r.shippingPayer === "customer" ? "selected" : ""}">
            <input type="radio" name="ship-payer" value="customer" data-set="returns.shippingPayer" data-rerender ${r.shippingPayer === "customer" ? "checked" : ""}>
            <span><span class="ch-title"><b>Customer pays return shipping</b></span><br><span class="ch-sub">The EU default, as long as it's disclosed up front. We show it in the form and the instructions email.</span></span>
          </label>
          <label class="choice boxed ${r.shippingPayer === "merchant" ? "selected" : ""}">
            <input type="radio" name="ship-payer" value="merchant" data-set="returns.shippingPayer" data-rerender ${r.shippingPayer === "merchant" ? "checked" : ""}>
            <span><span class="ch-title"><b>You pay return shipping</b></span><br><span class="ch-sub">Common conversion booster — "free returns" shown on the form.</span></span>
          </label>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Refund rules</h2></div></div>
        <div class="toggle-row">
          <label class="switch"><input type="checkbox" data-set="returns.refundStandardShipping" ${r.refundStandardShipping ? "checked" : ""}><span class="knob"></span></label>
          <div class="tr-text"><div class="tr-title">Refund standard outbound shipping <span class="badge brand">Required for full withdrawals</span></div><div class="tr-sub">EU law requires refunding the cheapest standard delivery you offer — express surcharges are excluded automatically.</div></div>
        </div>
        <div class="toggle-row">
          <label class="switch"><input type="checkbox" data-set="returns.withholdUntilReturn" ${r.withholdUntilReturn ? "checked" : ""}><span class="knob"></span></label>
          <div class="tr-text"><div class="tr-title">Withhold refund until the return arrives</div><div class="tr-sub">Allowed by Art. 13(3): refund when the goods are back or proof of postage is provided, whichever is first.</div></div>
        </div>
        <div class="toggle-row">
          <label class="switch"><input type="checkbox" data-set="returns.restock" ${r.restock ? "checked" : ""}><span class="knob"></span></label>
          <div class="tr-text"><div class="tr-title">Restock cancelled & returned items</div><div class="tr-sub">Inventory is adjusted automatically when an order is cancelled or a return is received.</div></div>
        </div>
        <div class="field" style="max-width:220px;margin-top:12px">
          <label>Days customers get to send goods back</label>
          <input class="input ${errs["returnDays"] ? "invalid" : ""}" type="number" min="14" max="60" data-set="returns.returnDays" data-rerender value="${r.returnDays}">
          ${errs["returnDays"] ? `<span class="err">${I.warn} ${errs["returnDays"]}</span>` : `<span class="hint">The legal minimum is 14 days from their withdrawal notice.</span>`}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Return address</h2><p class="card-sub">Included in the return-instructions email and on the confirmation step.</p></div></div>
        <textarea class="input" rows="4" data-set="returns.returnAddress">${esc(r.returnAddress)}</textarea>
      </div>
    </div>`;
}

/* --- Form & content --------------------------------------------------------- */

function renderForm(el, d, errs) {
  el.innerHTML = `
    <div class="cols cols-2-1">
      <div class="stack">
        <div class="card">
          <div class="card-head"><div><h2 class="card-title">Form fields</h2><p class="card-sub">Name, email and order items are always included. A reason can never be required by law — it stays optional.</p></div></div>
          <div class="toggle-row">
            <label class="switch"><input type="checkbox" data-set="form.reason.enabled" data-rerender ${d.form.reason.enabled ? "checked" : ""}><span class="knob"></span></label>
            <div class="tr-text"><div class="tr-title">Reason field</div><div class="tr-sub">Optional dropdown — powers your analytics.</div></div>
          </div>
          ${d.form.reason.enabled ? `
            <div style="margin:4px 0 10px 44px">
              <div class="field"><label>Field label</label><input class="input" data-set="form.reason.label" value="${esc(d.form.reason.label)}" style="max-width:340px"></div>
              <div class="field"><span class="lbl">Reason options</span>
                <div id="reason-opts">
                  ${d.form.reason.options.map((o, i) => `
                    <div class="input-row" style="margin-bottom:6px;max-width:400px">
                      <input class="input" data-ropt="${i}" value="${esc(o)}" style="height:28px">
                      <button class="btn sm ghost" data-rdel="${i}" aria-label="Remove option">${I.x}</button>
                    </div>`).join("")}
                </div>
                ${errs["reason.options"] ? `<span class="err">${I.warn} ${errs["reason.options"]}</span>` : ""}
                <button class="btn sm" id="reason-add" style="margin-top:2px">Add option</button>
              </div>
            </div>` : ""}
          <div class="toggle-row">
            <label class="switch"><input type="checkbox" data-set="form.comment.enabled" data-rerender ${d.form.comment.enabled ? "checked" : ""}><span class="knob"></span></label>
            <div class="tr-text"><div class="tr-title">Comment box</div><div class="tr-sub">Free-text field for extra context (always optional).</div></div>
          </div>
          <div class="toggle-row">
            <label class="switch"><input type="checkbox" data-set="form.iban.enabled" data-rerender ${d.form.iban.enabled ? "checked" : ""}><span class="knob"></span></label>
            <div class="tr-text"><div class="tr-title">IBAN field</div><div class="tr-sub">Only needed when refunding by bank transfer (e.g. cash-on-delivery orders).</div></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div><h2 class="card-title">Customer-facing text</h2><p class="card-sub">Edits show instantly in the preview. Editing English — other languages under General → languages.</p></div>
          </div>
          ${[
            ["labels.buttonLabel", "Storefront button label"],
            ["labels.title", "Step 1 · Title"],
            ["labels.description", "Step 1 · Description", true],
            ["labels.itemHeading", "Step 1 · Item list heading"],
            ["labels.continueLabel", "Step 1 · Button"],
            ["labels.confirmHeading", "Step 2 · Title"],
            ["labels.declaration", "Step 2 · Legal declaration", true],
            ["labels.confirmLabel", "Step 2 · Button"],
            ["labels.doneTitle", "Step 3 · Title"],
            ["labels.doneMessage", "Step 3 · Message", true],
          ].map(([path, label, isArea]) => {
            const val = getPath(d, path);
            return `<div class="field">
              <label>${label}</label>
              ${isArea ? `<textarea class="input" rows="2" data-set="${path}">${esc(val)}</textarea>` : `<input class="input" data-set="${path}" value="${esc(val)}">`}
            </div>`;
          }).join("")}
        </div>
      </div>

      <div class="sticky-col">
        <div class="card">
          <div class="card-head">
            <h2 class="card-title">Live preview</h2>
            <div class="seg">
              ${[["details", "Step 1"], ["confirm", "Step 2"], ["done", "Step 3"]].map(([k, l]) => `<button class="${SettingsCtl.previewStep === k ? "active" : ""}" data-pstep="${k}">${l}</button>`).join("")}
            </div>
          </div>
          <div id="form-preview-slot">${renderWidget(d, { step: SettingsCtl.previewStep })}</div>
          <p class="preview-note">Preview uses a sample order — one item is exempt to show eligibility handling.</p>
        </div>
      </div>
    </div>`;

  el.querySelectorAll("[data-pstep]").forEach((b) => b.addEventListener("click", () => {
    SettingsCtl.previewStep = b.dataset.pstep;
    el.querySelectorAll("[data-pstep]").forEach((x) => x.classList.toggle("active", x === b));
    refreshPreview(document.getElementById("content"), SettingsCtl.draft);
  }));
  el.querySelectorAll("[data-ropt]").forEach((inp) => inp.addEventListener("input", () => {
    SettingsCtl.draft.form.reason.options[+inp.dataset.ropt] = inp.value;
    syncSaveBar(document.getElementById("content"));
    refreshPreview(document.getElementById("content"), SettingsCtl.draft);
  }));
  el.querySelectorAll("[data-rdel]").forEach((btn) => btn.addEventListener("click", () => {
    SettingsCtl.draft.form.reason.options.splice(+btn.dataset.rdel, 1);
    Views.settings(document.getElementById("content"));
  }));
  el.querySelector("#reason-add")?.addEventListener("click", () => {
    SettingsCtl.draft.form.reason.options.push("");
    Views.settings(document.getElementById("content"));
  });
}

/* --- Automation ------------------------------------------------------------- */

function renderAutomation(el, d, errs) {
  const bs = d.automation.beforeShip, ad = d.automation.afterDelivery, aa = d.automation.autoApprove, fr = d.automation.flagRepeat;
  el.innerHTML = `
    <div class="stack" style="max-width:44rem">
      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Before the order ships</h2><p class="card-sub">The best-case withdrawal: the goods never leave your warehouse.</p></div></div>
        <div class="toggle-row">
          <label class="switch"><input type="checkbox" data-set="automation.beforeShip.hold" data-rerender ${bs.hold ? "checked" : ""}><span class="knob"></span></label>
          <div class="tr-text"><div class="tr-title">Hold fulfillment automatically</div><div class="tr-sub">When a request arrives for an unshipped order, pause it so it can't ship while you decide.</div></div>
        </div>
        ${bs.hold ? `
          <div style="margin-left:44px;margin-top:4px">
            <div class="field" style="max-width:400px">
              <label>If nobody decides in time</label>
              <div class="input-row">
                <select class="select" data-set="automation.beforeShip.fallback">
                  <option value="hold" ${bs.fallback === "hold" ? "selected" : ""}>Keep holding until someone decides</option>
                  <option value="release" ${bs.fallback === "release" ? "selected" : ""}>Release the hold after</option>
                  <option value="cancel" ${bs.fallback === "cancel" ? "selected" : ""}>Auto-approve & cancel after</option>
                </select>
                <input class="input ${errs["fallbackDays"] ? "invalid" : ""}" type="number" min="1" max="14" data-set="automation.beforeShip.fallbackDays" value="${bs.fallbackDays}" style="width:64px" aria-label="Fallback days">
                <span class="muted small">days</span>
              </div>
              ${errs["fallbackDays"] ? `<span class="err">${I.warn} ${errs["fallbackDays"]}</span>` : ""}
            </div>
          </div>` : ""}
        <div class="toggle-row">
          <label class="switch"><input type="checkbox" data-set="automation.beforeShip.tag" ${bs.tag ? "checked" : ""}><span class="knob"></span></label>
          <div class="tr-text"><div class="tr-title">Tag the order in Shopify</div><div class="tr-sub">Adds <span class="tag">eu-withdrawal</span> so staff, Flow workflows and other apps can react.</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div><h2 class="card-title">After delivery</h2><p class="card-sub">The goods are with the customer — this becomes a return.</p></div></div>
        <div class="choice-list">
          ${[
            ["notify", "Notify me and wait for review", "You approve or reject each request manually. Recommended."],
            ["instructions", "Auto-approve & send return instructions", "Customers immediately get your return address; you still control the refund after the goods arrive."],
          ].map(([v, t, sub]) => `
            <label class="choice boxed ${ad.action === v ? "selected" : ""}">
              <input type="radio" name="ad-action" value="${v}" data-set="automation.afterDelivery.action" data-rerender ${ad.action === v ? "checked" : ""}>
              <span><span class="ch-title"><b>${t}</b></span><br><span class="ch-sub">${sub}</span></span>
            </label>`).join("")}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Auto-approve</h2><p class="card-sub">Skip review for low-risk requests and respond instantly.</p></div></div>
        <div class="toggle-row">
          <label class="switch"><input type="checkbox" data-set="automation.autoApprove.enabled" data-rerender ${aa.enabled ? "checked" : ""}><span class="knob"></span></label>
          <div class="tr-text"><div class="tr-title">Auto-approve unshipped orders under a value limit</div><div class="tr-sub">Only before shipping, where approval simply cancels the order and refunds in full.</div></div>
        </div>
        ${aa.enabled ? `
          <div class="field" style="margin-left:44px;max-width:200px">
            <label>Maximum order value</label>
            <div class="input-row"><span class="muted">€</span><input class="input" type="number" min="1" data-set="automation.autoApprove.maxValue" value="${aa.maxValue}"></div>
          </div>` : ""}
      </div>

      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Abuse signals</h2><p class="card-sub">The right of withdrawal always applies — these only add context for your review.</p></div></div>
        <div class="toggle-row">
          <label class="switch"><input type="checkbox" data-set="automation.flagRepeat.enabled" data-rerender ${fr.enabled ? "checked" : ""}><span class="knob"></span></label>
          <div class="tr-text"><div class="tr-title">Flag frequent withdrawers</div><div class="tr-sub">Shows a “Frequent” badge on customers with many past requests.</div></div>
        </div>
        ${fr.enabled ? `
          <div class="field" style="margin-left:44px;max-width:200px">
            <label>Flag from</label>
            <div class="input-row"><input class="input" type="number" min="2" max="20" data-set="automation.flagRepeat.threshold" value="${fr.threshold}"><span class="muted small">requests</span></div>
          </div>` : ""}
        <div class="toggle-row">
          <label class="switch"><input type="checkbox" data-set="automation.tagCustomer" ${d.automation.tagCustomer ? "checked" : ""}><span class="knob"></span></label>
          <div class="tr-text"><div class="tr-title">Tag the customer profile</div><div class="tr-sub">Adds <span class="tag">withdrawal-requested</span> to the Shopify customer for segmentation.</div></div>
        </div>
      </div>
    </div>`;
}

/* --- Emails ----------------------------------------------------------------- */

function renderEmails(el, d) {
  const b = d.emails.branding;

  if (SettingsCtl.emailEdit) {
    const key = SettingsCtl.emailEdit;
    const meta = DEFAULT_EMAILS[key];
    const tpl = d.emails.templates[key];
    const isDefault = tpl.subject === meta.subject && tpl.body === meta.body;

    el.innerHTML = `
      <div class="cols cols-2-1">
        <div class="stack">
          <div class="card">
            <div class="card-head">
              <div>
                <h2 class="card-title">${esc(meta.name)} ${meta.required ? '<span class="badge brand">Required by law</span>' : ""} ${!isDefault ? '<span class="badge info">Customized</span>' : ""}</h2>
                <p class="card-sub">${esc(meta.hint)}</p>
              </div>
              <button class="btn sm" id="eml-back">${I.chevL} All templates</button>
            </div>
            <div class="field">
              <label for="eml-subject">Subject</label>
              <input class="input" id="eml-subject" data-set="emails.templates.${key}.subject" value="${esc(tpl.subject)}">
            </div>
            <div class="field">
              <label for="eml-body">Body</label>
              <textarea class="input" id="eml-body" rows="12" data-set="emails.templates.${key}.body">${esc(tpl.body)}</textarea>
            </div>
            <div class="field">
              <span class="lbl">Variables — click to insert</span>
              <div class="var-chips">
                ${EMAIL_VARIABLES.map(([v]) => `<button class="var-chip" data-var="${v}">{{${v}}}</button>`).join("")}
              </div>
            </div>
            <hr class="divider">
            <div class="row">
              <button class="btn" id="eml-test">Send test email</button>
              <span class="spacer"></span>
              <button class="btn ${isDefault ? "" : "danger"}" id="eml-reset" ${isDefault ? "disabled" : ""}>Reset to default</button>
            </div>
          </div>
        </div>
        <div class="sticky-col">
          <div class="card">
            <div class="card-head"><h2 class="card-title">Preview</h2><span class="muted small">Sample data</span></div>
            <div id="email-preview-slot">${emailPreview(tpl, b)}</div>
          </div>
        </div>
      </div>`;

    el.querySelector("#eml-back").addEventListener("click", () => { SettingsCtl.emailEdit = null; Views.settings(document.getElementById("content")); });
    el.querySelector("#eml-reset").addEventListener("click", () => {
      d.emails.templates[key] = { subject: meta.subject, body: meta.body };
      Views.settings(document.getElementById("content"));
      toast("Template reset to default");
    });
    el.querySelector("#eml-test").addEventListener("click", () => toast(`Test email sent to ${State.settings.notifications.merchantEmail}`));

    /* insert variable at cursor in the last-focused field (body by default) */
    let lastField = el.querySelector("#eml-body");
    ["#eml-subject", "#eml-body"].forEach((sel) => el.querySelector(sel).addEventListener("focus", (e) => { lastField = e.target; }));
    el.querySelectorAll("[data-var]").forEach((chip) => chip.addEventListener("click", () => {
      const token = `{{${chip.dataset.var}}}`;
      const start = lastField.selectionStart ?? lastField.value.length;
      lastField.value = lastField.value.slice(0, start) + token + lastField.value.slice(lastField.selectionEnd ?? start);
      lastField.dispatchEvent(new Event("input"));
      lastField.focus();
      lastField.selectionStart = lastField.selectionEnd = start + token.length;
    }));
    return;
  }

  const rows = Object.entries(DEFAULT_EMAILS).map(([key, meta]) => {
    const tpl = d.emails.templates[key];
    const isDefault = tpl.subject === meta.subject && tpl.body === meta.body;
    return `
      <div class="tmpl-row">
        <span class="tm-icon">${I.mail}</span>
        <div class="tm-body">
          <div class="tm-name">${esc(meta.name)} ${meta.required ? '<span class="badge brand">Required</span>' : ""} ${!isDefault ? '<span class="badge info">Customized</span>' : ""}</div>
          <div class="tm-sub">${esc(fillVariables(tpl.subject))}</div>
        </div>
        <button class="btn sm" data-eml-edit="${key}">Edit</button>
      </div>`;
  }).join("");

  el.innerHTML = `
    <div class="stack" style="max-width:44rem">
      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Branding</h2><p class="card-sub">Applied to every customer email.</p></div></div>
        <div class="cols cols-half">
          <div class="field"><label>From name</label><input class="input" data-set="emails.branding.fromName" value="${esc(b.fromName)}"></div>
          <div class="field"><label>Reply-to address</label><input class="input" type="email" data-set="emails.branding.replyTo" value="${esc(b.replyTo)}"></div>
        </div>
        <div class="row" style="margin-top:12px;gap:16px">
          <div class="field" style="flex:none">
            <label>Accent color</label>
            <span class="color-input"><input type="color" data-set="emails.branding.accent" value="${esc(b.accent)}" aria-label="Email accent color"><span>${esc(b.accent)}</span></span>
          </div>
          <label class="check" style="margin-top:18px">
            <input type="checkbox" data-set="emails.branding.showLogo" ${b.showLogo ? "checked" : ""}>
            <span class="ck-text">Show store name as logo header</span>
          </label>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Customer email templates</h2><p class="card-sub">Each one supports variables, previews and a one-click reset.</p></div></div>
        ${rows}
      </div>

      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Notifications to you</h2></div></div>
        <div class="field" style="max-width:320px;margin-bottom:4px">
          <label>Send to</label>
          <input class="input" type="email" data-set="notifications.merchantEmail" value="${esc(d.notifications.merchantEmail)}">
        </div>
        <div class="toggle-row">
          <label class="switch"><input type="checkbox" data-set="notifications.merchantNew" ${d.notifications.merchantNew ? "checked" : ""}><span class="knob"></span></label>
          <div class="tr-text"><div class="tr-title">New request alert</div><div class="tr-sub">One email per request, with a one-click link to review it.</div></div>
        </div>
        <div class="toggle-row">
          <label class="switch"><input type="checkbox" data-set="notifications.merchantDigest" ${d.notifications.merchantDigest ? "checked" : ""}><span class="knob"></span></label>
          <div class="tr-text"><div class="tr-title">Weekly digest</div><div class="tr-sub">Monday summary: new requests, upcoming deadlines, response times.</div></div>
        </div>
      </div>
    </div>`;

  el.querySelectorAll("[data-eml-edit]").forEach((btn) => btn.addEventListener("click", () => {
    SettingsCtl.emailEdit = btn.dataset.emlEdit;
    Views.settings(document.getElementById("content"));
  }));
}

/* --- Compliance -------------------------------------------------------------- */

function renderCompliance(el, d) {
  const modelForm = `To ${d.emails.branding.fromName} (${d.notifications.merchantEmail}):

I/We (*) hereby give notice that I/We (*) withdraw from my/our (*)
contract of sale of the following goods (*)/for the provision of the
following service (*):

Ordered on (*)/received on (*):
Name of consumer(s):
Address of consumer(s):
Signature of consumer(s) (only if this form is notified on paper):
Date:

(*) Delete as appropriate.`;

  el.innerHTML = `
    <div class="stack" style="max-width:44rem">
      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Compliance checklist</h2><p class="card-sub">How your current configuration maps to the EU rules.</p></div></div>
        ${[
          [d.enabled && d.surfaces.themeButton, "Electronic withdrawal function (Directive 2023/2673, from 19 Jun 2026)", d.enabled && d.surfaces.themeButton ? "Storefront button is live" : "Turn on the storefront button under General"],
          [d.window.days >= 14, "At least 14 days after delivery (Art. 9)", `${d.window.days}-day window configured`],
          [true, "Acknowledgement on a durable medium (Art. 11a)", "Automatic email on every request — can't be disabled"],
          [true, "No reason may be required (Art. 9)", "Reason field is always optional"],
          [d.returns.refundStandardShipping, "Refund incl. standard delivery (Art. 13)", d.returns.refundStandardShipping ? "Standard shipping is refunded on full withdrawals" : "Turn on standard-shipping refunds under Returns & refunds"],
          [true, "Refund within 14 days (Art. 13)", "Deadline clocks tracked on every request"],
          [true, "Model withdrawal form available (Annex I B)", "Hosted on your withdrawal page"],
        ].map(([ok, t, sub]) => `
          <div class="row" style="align-items:flex-start;flex-wrap:nowrap;padding:6px 0">
            <span style="color:${ok ? "var(--ok-strong)" : "#b28400"};flex:none;width:16px;height:16px;margin-top:1px">${ok ? I.check : I.warn}</span>
            <div><div style="font-weight:550;font-size:12.5px">${t}</div><div class="muted small">${sub}</div></div>
          </div>`).join("")}
      </div>

      <div class="card">
        <div class="card-head">
          <div><h2 class="card-title">Model withdrawal form (Annex I B)</h2><p class="card-sub">You must make this form available. We host it on your withdrawal page — you can also paste it into your terms.</p></div>
          <button class="btn sm" id="copy-model">Copy</button>
        </div>
        <div class="code" id="model-form">${esc(modelForm)}</div>
      </div>

      <div class="card">
        <div class="card-head">
          <div><h2 class="card-title">Withdrawal policy text</h2><p class="card-sub">A ready-to-paste policy section generated from your settings, for your terms or policy pages.</p></div>
          <button class="btn sm" id="copy-policy">Copy</button>
        </div>
        <div class="code" id="policy-text">Right of withdrawal

You may withdraw from your purchase within ${d.window.days} days of
receiving your goods, without giving any reason. To do so, use the
"${esc(d.labels.buttonLabel)}" button on our website, the withdrawal
form on your order page, or the model withdrawal form.

We will refund all payments including standard delivery within 14 days
of your withdrawal${d.returns.withholdUntilReturn ? ", once we receive the goods back or proof of postage" : ""}.
${d.returns.shippingPayer === "customer" ? "You bear the direct cost of returning the goods." : "We cover the cost of returning the goods."}
Exemptions apply to personalized, perishable and sealed hygiene goods.</div>
      </div>

      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Data processing</h2></div></div>
        <div class="row" style="align-items:flex-start;flex-wrap:nowrap;padding:4px 0">
          <span style="color:var(--ok-strong);flex:none;width:16px;height:16px">${I.check}</span>
          <div><div style="font-weight:550;font-size:12.5px">Data Processing Agreement accepted</div><div class="muted small">Accepted during onboarding · <a href="#" data-toast="DPA opens in a new tab (demo)">view agreement</a></div></div>
        </div>
        <hr class="divider">
        <p class="muted small" style="max-width:62ch">Withdrawal requests contain personal data (name, email, address). Requests are stored in the EU and deleted 24 months after resolution. Uninstalling the app deletes all shop data within 48 hours.</p>
      </div>

      <div class="banner">${I.info}<div><div class="bn-title">Not legal advice</div><div class="bn-body">EU Withdrawly implements the common requirements of Directive 2011/83/EU as amended. National law can add details — when in doubt, check with your legal counsel.</div></div></div>
    </div>`;

  el.querySelector("#copy-model").addEventListener("click", () => copyEl("#model-form", "Model form copied"));
  el.querySelector("#copy-policy").addEventListener("click", () => copyEl("#policy-text", "Policy text copied"));
  function copyEl(sel, msg) {
    navigator.clipboard?.writeText(el.querySelector(sel).textContent)
      .then(() => toast(msg))
      .catch(() => toast("Couldn't access the clipboard", { error: true }));
  }
  el.querySelectorAll("[data-toast]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); toast(a.dataset.toast); }));
}
