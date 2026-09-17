/* ==========================================================================
   Views: withdrawal requests list + request detail (full lifecycle)
   pending -> awaiting_return -> return_received -> refunded | rejected
   ========================================================================== */

const ReqListState = { tab: "all", q: "", type: "all", country: "all", selected: new Set() };

function requestMatchesTab(r, tab) {
  if (tab === "all") return true;
  if (tab === "in_progress") return IN_PROGRESS.includes(r.status);
  return r.status === tab;
}

Views.requests = function (root) {
  const L = ReqListState;
  const all = State.requests.slice().sort((a, b) => b.submittedAt - a.submittedAt);
  const counts = { all: all.length, pending: 0, in_progress: 0, refunded: 0, rejected: 0 };
  all.forEach((r) => {
    if (IN_PROGRESS.includes(r.status)) counts.in_progress += 1;
    else counts[r.status] = (counts[r.status] ?? 0) + 1;
  });

  const countryOpts = [...new Set(all.map((r) => r.countryCode))].sort();
  const filtered = all.filter((r) => {
    if (!requestMatchesTab(r, L.tab)) return false;
    if (L.type !== "all" && r.type !== L.type) return false;
    if (L.country !== "all" && r.countryCode !== L.country) return false;
    const q = L.q.trim().toLowerCase();
    if (q && ![r.orderName, r.customerName, r.customerEmail, r.id].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });

  const selectedPending = [...L.selected].filter((id) => State.requests.find((x) => x.id === id)?.status === "pending");
  const flagCfg = State.settings.automation.flagRepeat;

  root.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div class="ph-text">
          <h1 class="page-title">Requests</h1>
          <p class="page-sub">Every withdrawal request, with the deadline that matters at each stage of its lifecycle.</p>
        </div>
        <div class="page-actions">
          <button class="btn" id="req-export">Export CSV</button>
          <button class="btn primary" data-nav="preview-flow">Submit a test request</button>
        </div>
      </div>

      <div class="card flush">
        <div class="row between" style="padding:10px 12px 8px">
          <div class="tabs">
            ${[["all", "All"], ["pending", "Pending"], ["in_progress", "In progress"], ["refunded", "Refunded"], ["rejected", "Rejected"]].map(([k, l]) => `
              <button class="tab ${L.tab === k ? "active" : ""}" data-tab="${k}">${l}<span class="cnt num">${counts[k] ?? 0}</span></button>`).join("")}
          </div>
        </div>
        <div class="row" style="padding:0 12px 12px">
          <div class="search-wrap">
            ${'<svg viewBox="0 0 20 20" fill="currentColor"><path d="M8.5 3a5.5 5.5 0 1 0 3.4 9.8l3.1 3.2a.75.75 0 1 0 1.1-1l-3.2-3.2A5.5 5.5 0 0 0 8.5 3Zm-4 5.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"/></svg>'}
            <input class="input" id="req-q" placeholder="Search order, customer, email" value="${esc(L.q)}" aria-label="Search requests">
          </div>
          <select class="select" id="req-type" style="width:auto;height:28px" aria-label="Filter by type">
            <option value="all" ${L.type === "all" ? "selected" : ""}>All types</option>
            <option value="before_fulfillment" ${L.type === "before_fulfillment" ? "selected" : ""}>Before shipping</option>
            <option value="after_delivery" ${L.type === "after_delivery" ? "selected" : ""}>After delivery</option>
          </select>
          <select class="select" id="req-country" style="width:auto;height:28px" aria-label="Filter by country">
            <option value="all">All countries</option>
            ${countryOpts.map((c) => `<option value="${c}" ${L.country === c ? "selected" : ""}>${flag(c)} ${COUNTRY_NAME[c] || c}</option>`).join("")}
          </select>
          ${selectedPending.length ? `
            <span class="spacer"></span>
            <div class="bulk-bar">
              <span>${selectedPending.length} selected</span>
              <button class="btn sm" id="bulk-approve">Approve</button>
              <button class="btn sm danger" id="bulk-reject">Reject</button>
            </div>` : ""}
        </div>

        ${filtered.length === 0 ? `
          <div class="empty">
            <div class="emp-icon">${I.inbox}</div>
            <div class="emp-title">${all.length === 0 ? "No withdrawal requests yet" : "Nothing matches these filters"}</div>
            <p>${all.length === 0 ? "Once your withdrawal button is live, customer requests will land here with everything you need to decide." : "Try clearing the search or filters."}</p>
            ${all.length === 0 ? `<button class="btn primary" data-nav="preview-flow">Try the customer flow</button>` : `<button class="btn" id="clear-filters">Clear filters</button>`}
          </div>` : `
          <div class="table-scroll">
            <table class="data">
              <thead><tr>
                <th style="width:32px"><input type="checkbox" id="sel-all" aria-label="Select all" ${filtered.length && filtered.every((r) => L.selected.has(r.id)) ? "checked" : ""}></th>
                <th>Request</th><th>Customer</th><th>Items</th><th class="num">Value</th><th>Type</th><th>Status</th><th>Deadline</th><th>Submitted</th>
              </tr></thead>
              <tbody>
                ${filtered.map((r) => {
                  const full = r.items.length >= (r.orderLineCount ?? r.items.length);
                  const repeat = flagCfg.enabled && r.repeatCount >= flagCfg.threshold;
                  return `
                  <tr data-req="${r.id}" class="${L.selected.has(r.id) ? "selected" : ""}">
                    <td><input type="checkbox" data-sel="${r.id}" aria-label="Select ${r.id}" ${L.selected.has(r.id) ? "checked" : ""}></td>
                    <td><span class="cell-main">${r.orderName}</span><div class="cell-sub">${r.id}</div></td>
                    <td><span class="cell-main">${flag(r.countryCode)} ${esc(r.customerName)} ${repeat ? `<span class="badge attn" title="${r.repeatCount} withdrawal requests from this customer">Frequent</span>` : ""}</span><div class="cell-sub">${esc(r.customerEmail)}</div></td>
                    <td>${r.items.length} item${r.items.length === 1 ? "" : "s"}<div class="cell-sub">${full ? "Full order" : "Partial"}</div></td>
                    <td class="num cell-main">${fmtMoney(r.value)}</td>
                    <td>${typeBadge(r.type)}</td>
                    <td>${statusBadge(r.status)}</td>
                    <td>${deadlineBadge(r) || `<span class="muted">—</span>`}</td>
                    <td class="muted">${timeAgo(r.submittedAt)}</td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
          <div class="row between" style="padding:10px 16px;border-top:1px solid var(--border)">
            <span class="muted small">${filtered.length} of ${all.length} requests</span>
            <span class="muted small">Requests are archived 24 months after resolution</span>
          </div>`}
      </div>
    </div>`;

  const rerender = () => Views.requests(root);

  root.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { L.tab = b.dataset.tab; rerender(); }));
  root.querySelector("#req-q").addEventListener("input", (e) => {
    L.q = e.target.value;
    clearTimeout(L._t); L._t = setTimeout(rerender, 250);
  });
  root.querySelector("#req-type").addEventListener("change", (e) => { L.type = e.target.value; rerender(); });
  root.querySelector("#req-country").addEventListener("change", (e) => { L.country = e.target.value; rerender(); });
  root.querySelector("#clear-filters")?.addEventListener("click", () => {
    Object.assign(L, { tab: "all", q: "", type: "all", country: "all" }); rerender();
  });

  root.querySelectorAll("[data-sel]").forEach((cb) => cb.addEventListener("click", (e) => {
    e.stopPropagation();
    cb.checked ? L.selected.add(cb.dataset.sel) : L.selected.delete(cb.dataset.sel);
    rerender();
  }));
  root.querySelector("#sel-all")?.addEventListener("click", (e) => {
    e.stopPropagation();
    filtered.forEach((r) => e.target.checked ? L.selected.add(r.id) : L.selected.delete(r.id));
    rerender();
  });
  root.querySelectorAll("tbody [data-req]").forEach((tr) => tr.addEventListener("click", (e) => {
    if (e.target.closest("input")) return;
    go(`requests/${tr.dataset.req}`);
  }));

  function bulkDecide(kind) {
    const ids = selectedPending;
    openModal({
      title: `${kind === "approve" ? "Approve" : "Reject"} ${ids.length} request${ids.length === 1 ? "" : "s"}?`,
      body: `<p>${kind === "approve"
        ? "Unshipped orders are cancelled and refunded in full; delivered orders get return instructions. Each customer receives the matching decision email."
        : "Each customer receives the rejection email with your reason. Rejection is only lawful for exempt goods or requests outside the window."}</p>
        ${kind === "reject" ? `<div class="field" style="margin-top:10px"><label>Reason shown to customers</label><textarea class="input" id="bulk-reason" placeholder="e.g. Outside the ${State.settings.window.days}-day withdrawal window"></textarea></div>` : ""}`,
      foot: `<button class="btn" data-close="1">Cancel</button><button class="btn ${kind === "approve" ? "primary" : "danger solid"}" id="bulk-go">${kind === "approve" ? "Approve all" : "Reject all"}</button>`,
      onMount(modal) {
        modal.querySelector("#bulk-go").addEventListener("click", () => {
          const reason = modal.querySelector("#bulk-reason")?.value?.trim();
          ids.forEach((id) => kind === "approve"
            ? approveRequest(id, State.requests.find((x) => x.id === id).type === "before_fulfillment" ? "cancel" : "return")
            : rejectRequest(id, reason));
          L.selected.clear();
          closeModal();
          toast(`${ids.length} request${ids.length === 1 ? "" : "s"} ${kind === "approve" ? "approved" : "rejected"}`);
          rerender(); renderNav();
        });
      },
    });
  }
  root.querySelector("#bulk-approve")?.addEventListener("click", () => bulkDecide("approve"));
  root.querySelector("#bulk-reject")?.addEventListener("click", () => bulkDecide("reject"));

  root.querySelector("#req-export").addEventListener("click", () => {
    const rows = [["id", "order", "customer", "email", "country", "type", "status", "reason", "value_eur", "submitted", "decided"]];
    filtered.forEach((r) => rows.push([r.id, r.orderName, r.customerName, r.customerEmail, r.countryCode, r.type, r.status, r.reason, r.value, new Date(r.submittedAt).toISOString(), r.decidedAt ? new Date(r.decidedAt).toISOString() : ""]));
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "withdrawal-requests.csv";
    a.click();
    toast("CSV exported");
  });
};

/* --- lifecycle transitions ------------------------------------------------- */

function refundTotal(r) {
  const shipping = State.settings.returns.refundStandardShipping ? r.shipping : 0;
  return r.value + shipping - (r.deduction || 0);
}

function approveRequest(id, resolution) {
  const r = State.requests.find((x) => x.id === id);
  if (!r || r.status !== "pending") return;
  const now = Date.now();
  r.decidedAt = now;
  if (resolution === "cancel") {
    r.status = "refunded";
    r.timeline.push({ t: now, kind: "ok", title: "Request approved — order cancelled", meta: `Cancelled before shipping${State.settings.returns.restock ? "; items restocked" : ""}` });
    r.timeline.push({ t: now + 1000, kind: "ok", title: `Refund of ${fmtMoney(refundTotal(r))} issued`, meta: "Original payment method · includes standard shipping" });
    r.timeline.push({ t: now + 2000, kind: "ok", title: "“Order cancelled” email sent", meta: `Sent to ${r.customerEmail}` });
  } else {
    r.status = "awaiting_return";
    r.returnDueAt = now + State.settings.returns.returnDays * 86400e3;
    r.timeline.push({ t: now, kind: "ok", title: "Request approved", meta: "Return instructions emailed to customer" });
  }
  persist();
}

function rejectRequest(id, reason) {
  const r = State.requests.find((x) => x.id === id);
  if (!r || r.status !== "pending") return;
  const now = Date.now();
  r.status = "rejected";
  r.decidedAt = now;
  r.timeline.push({ t: now, kind: "crit", title: "Request rejected", meta: reason || "No reason recorded" });
  r.timeline.push({ t: now + 1000, kind: "crit", title: "Rejection email sent", meta: `Sent to ${r.customerEmail}` });
  persist();
}

function markReturnReceived(id) {
  const r = State.requests.find((x) => x.id === id);
  if (!r || r.status !== "awaiting_return") return;
  r.status = "return_received";
  r.timeline.push({ t: Date.now(), kind: "brand", title: "Return received", meta: "Marked received at the warehouse" });
  persist();
}

function issueRefund(id, { deduction = 0, deductionReason = "" } = {}) {
  const r = State.requests.find((x) => x.id === id);
  if (!r || r.status !== "return_received") return;
  r.deduction = deduction;
  r.status = "refunded";
  const now = Date.now();
  r.timeline.push({
    t: now, kind: "ok", title: `Refund of ${fmtMoney(refundTotal(r))} issued`,
    meta: deduction ? `After ${fmtMoney(deduction)} deduction for diminished value — ${deductionReason}` : "Full refund incl. standard shipping",
  });
  r.timeline.push({ t: now + 1000, kind: "ok", title: "“Refund issued” email sent", meta: `Sent to ${r.customerEmail}` });
  persist();
}

/* ==========================================================================
   Request detail
   ========================================================================== */

Views.requestDetail = function (root, params) {
  const r = State.requests.find((x) => x.id === params.id);
  if (!r) {
    root.innerHTML = `<div class="page"><div class="empty"><div class="emp-icon">${I.inbox}</div><div class="emp-title">Request not found</div><p>It may have been removed with a demo reset.</p><button class="btn" data-nav="requests">Back to requests</button></div></div>`;
    return;
  }
  const sorted = State.requests.slice().sort((a, b) => b.submittedAt - a.submittedAt);
  const idx = sorted.findIndex((x) => x.id === r.id);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
  const full = r.items.length >= (r.orderLineCount ?? r.items.length);
  const flagCfg = State.settings.automation.flagRepeat;
  const isRepeat = flagCfg.enabled && r.repeatCount >= flagCfg.threshold;
  const ret = State.settings.returns;

  const actions = {
    pending: `
      <button class="btn danger" id="req-reject">Reject</button>
      <button class="btn primary" id="req-approve">Approve</button>`,
    awaiting_return: `
      <button class="btn" data-toast="Return instructions re-sent to ${esc(r.customerEmail)}">Resend instructions</button>
      <button class="btn primary" id="req-received">Mark return received</button>`,
    return_received: `
      <button class="btn primary" id="req-refund">Issue refund</button>`,
    refunded: "", rejected: "",
  }[r.status];

  root.innerHTML = `
    <div class="page">
      <button class="back-link" data-nav="requests">${I.chevL} Requests</button>
      <div class="page-head">
        <div class="ph-text">
          <h1 class="page-title">${r.id} ${statusBadge(r.status)} ${typeBadge(r.type)}</h1>
          <p class="page-sub">Order ${r.orderName} · submitted ${fmtDateTime(r.submittedAt)} (${timeAgo(r.submittedAt)})${r.decidedAt ? ` · decided ${fmtDateTime(r.decidedAt)}` : ""}</p>
        </div>
        <div class="page-actions">
          <button class="btn sm" id="req-prev" ${prev ? "" : "disabled"} aria-label="Newer request">${I.chevL}</button>
          <button class="btn sm" id="req-next" ${next ? "" : "disabled"} aria-label="Older request">${I.chevR}</button>
          ${actions}
        </div>
      </div>

      ${r.status === "pending" && r.type === "before_fulfillment" ? `<div style="margin-bottom:14px">${banner("info", "Fulfillment is on hold", "This order was automatically held when the request came in. Approving cancels the order and refunds in full — the goods never leave your warehouse.")}</div>` : ""}
      ${isRepeat ? `<div style="margin-bottom:14px">${banner("warn", `Frequent withdrawer — ${r.repeatCount} requests from this customer`, "Flagged by your automation settings. The right of withdrawal still applies; use this only as context for fraud checks.")}</div>` : ""}

      <div class="cols cols-2-1">
        <div class="stack">
          <div class="card">
            <div class="card-head">
              <div><h2 class="card-title">Requested items</h2><p class="card-sub">${full ? "Full order withdrawal" : `Partial — ${r.items.length} of ${r.orderLineCount} order lines`}</p></div>
              <span class="strong num">${fmtMoney(r.value)}</span>
            </div>
            ${r.items.map((it) => `
              <div class="li-row">
                <span class="li-thumb">${it.emoji}</span>
                <div class="li-body"><div class="li-title">${esc(it.title)}</div><div class="li-sub">SKU ${it.sku} · Qty ${it.qty}</div></div>
                <span class="li-price">${fmtMoney(it.price * it.qty)}</span>
              </div>`).join("")}
            <hr class="divider">
            <dl class="kv">
              <dt>Items</dt><dd class="num">${fmtMoney(r.value)}</dd>
              <dt>Standard shipping${ret.refundStandardShipping ? "" : " (not refunded)"}</dt><dd class="num">${ret.refundStandardShipping ? fmtMoney(r.shipping) : fmtMoney(0)}</dd>
              ${r.deduction ? `<dt>Diminished-value deduction</dt><dd class="num" style="color:var(--crit-ink)">−${fmtMoney(r.deduction)}</dd>` : ""}
              <dt class="strong" style="color:var(--ink)">${r.status === "refunded" ? "Refunded" : "Refund due"}</dt><dd class="num strong">${fmtMoney(refundTotal(r))}</dd>
            </dl>
          </div>

          <div class="card">
            <div class="card-head"><h2 class="card-title">Customer's reason</h2></div>
            <p><b>${esc(r.reason || "Not given")}</b>${r.reason ? ' <span class="muted small">— optional field; no reason is legally required</span>' : ""}</p>
            ${r.comment ? `<div class="tl-note" style="margin-top:8px">“${esc(r.comment)}”</div>` : ""}
          </div>

          <div class="card">
            <div class="card-head"><h2 class="card-title">Timeline</h2></div>
            <div class="timeline">
              ${r.timeline.slice().sort((a, b) => a.t - b.t).map((e) => `
                <div class="tl-item ${e.kind || ""}">
                  <div class="tl-title">${esc(e.title)}</div>
                  <div class="tl-meta">${esc(e.meta || "")} · ${fmtDateTime(e.t)}</div>
                </div>`).join("")}
              ${r.notes.slice().sort((a, b) => a.t - b.t).map((n) => `
                <div class="tl-item">
                  <div class="tl-title">Internal note</div>
                  <div class="tl-meta">${fmtDateTime(n.t)} · only visible to your team</div>
                  <div class="tl-note">${esc(n.body)}</div>
                </div>`).join("")}
            </div>
            <hr class="divider">
            <div class="input-row">
              <input class="input" id="note-input" placeholder="Add an internal note…" aria-label="Add internal note">
              <button class="btn" id="note-add">Add note</button>
            </div>
          </div>
        </div>

        <div class="stack">
          ${["pending", "return_received"].includes(r.status) ? `<div class="card">${deadlineRing(r)}</div>` : ""}
          ${r.status === "awaiting_return" ? `<div class="card">
            <div class="card-head"><h2 class="card-title">Return in transit</h2></div>
            <p class="muted small">Customer was asked to return by <b style="color:var(--ink)">${fmtDate(r.returnDueAt)}</b>. Refund is due within 14 days of the request, but you may withhold it until the goods arrive or proof of postage is provided (Art. 13(3)).</p>
          </div>` : ""}

          <div class="card">
            <div class="card-head"><h2 class="card-title">Customer</h2></div>
            <dl class="kv">
              <dt>Name</dt><dd>${esc(r.customerName)}</dd>
              <dt>Email</dt><dd><a href="mailto:${esc(r.customerEmail)}">${esc(r.customerEmail)}</a></dd>
              <dt>Country</dt><dd>${flag(r.countryCode)} ${COUNTRY_NAME[r.countryCode] || r.countryCode}</dd>
              <dt>Past requests</dt><dd>${r.repeatCount || "None"}</dd>
            </dl>
          </div>

          <div class="card">
            <div class="card-head"><h2 class="card-title">Order</h2><button class="btn sm ghost" data-toast="Order ${esc(r.orderName)} opens in Shopify admin (demo)">Open ${I.ext}</button></div>
            <dl class="kv">
              <dt>Order</dt><dd>${r.orderName}</dd>
              <dt>Fulfillment</dt><dd>${r.type === "before_fulfillment" ? (r.status === "refunded" ? "Cancelled" : r.status === "pending" ? "On hold" : "Unfulfilled") : "Delivered"}</dd>
              <dt>Payment</dt><dd>${r.status === "refunded" ? "Refunded" : "Paid"}</dd>
              <dt>Return shipping</dt><dd>${ret.shippingPayer === "customer" ? "Customer pays" : "You pay"}</dd>
            </dl>
          </div>

          <div class="card">
            <div class="card-head"><h2 class="card-title">Tags</h2></div>
            <div class="chips" id="tag-list" style="margin-bottom:10px">
              ${r.tags.length ? r.tags.map((t) => `<span class="tag">${esc(t)}<button data-untag="${esc(t)}" aria-label="Remove tag ${esc(t)}">${I.x}</button></span>`).join("") : '<span class="muted small">No tags yet</span>'}
            </div>
            <div class="input-row">
              <input class="input" id="tag-input" placeholder="Add a tag…" aria-label="Add tag" style="height:28px">
              <button class="btn sm" id="tag-add">Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const rerender = () => Views.requestDetail(root, params);

  root.querySelector("#req-prev")?.addEventListener("click", () => prev && go(`requests/${prev.id}`));
  root.querySelector("#req-next")?.addEventListener("click", () => next && go(`requests/${next.id}`));

  root.querySelector("#note-add")?.addEventListener("click", () => {
    const input = root.querySelector("#note-input");
    const body = input.value.trim();
    if (!body) return;
    r.notes.push({ t: Date.now(), body });
    persist(); toast("Note added"); rerender();
  });

  root.querySelector("#tag-add")?.addEventListener("click", addTag);
  root.querySelector("#tag-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") addTag(); });
  function addTag() {
    const input = root.querySelector("#tag-input");
    const t = input.value.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t) return;
    if (!r.tags.includes(t)) { r.tags.push(t); persist(); }
    rerender();
  }
  root.querySelectorAll("[data-untag]").forEach((b) => b.addEventListener("click", () => {
    r.tags = r.tags.filter((t) => t !== b.dataset.untag);
    persist(); rerender();
  }));

  root.querySelectorAll("[data-toast]").forEach((b) => b.addEventListener("click", () => toast(b.dataset.toast)));

  /* --- approve ------------------------------------------------------------ */
  root.querySelector("#req-approve")?.addEventListener("click", () => {
    const isHold = r.type === "before_fulfillment";
    const branding = State.settings.emails.branding;
    const tplKey = isHold ? "approved_cancel" : "approved_return";
    const overrides = {
      customer_first_name: r.customerName.split(" ")[0],
      order_name: r.orderName, request_id: r.id,
      refund_amount: fmtMoney(refundTotal(r)),
      items_list: r.items.map((it) => `${it.qty}× ${it.title}`).join(", "),
      return_deadline: fmtDateLong(Date.now() + ret.returnDays * 86400e3),
    };
    openModal({
      title: `Approve ${r.id}?`,
      wide: true,
      body: `
        ${isHold ? `
        <div class="field"><span class="lbl">What should happen to order ${r.orderName}?</span>
          <div class="choice-list">
            <label class="choice boxed selected"><input type="radio" name="ap-res" value="cancel" checked>
              <span><span class="ch-title"><b>Cancel the order & refund in full</b> (recommended)</span><br><span class="ch-sub">Never ships. ${fmtMoney(refundTotal(r))} back to the original payment method${State.settings.returns.restock ? "; items restocked" : ""}.</span></span></label>
            <label class="choice boxed"><input type="radio" name="ap-res" value="return">
              <span><span class="ch-title"><b>Release the hold & handle as a return</b></span><br><span class="ch-sub">Ships normally; the customer returns it and you refund after receipt.</span></span></label>
          </div>
        </div>` : `
        <p>The customer receives <b>return instructions</b> with your return address. The refund of <b>${fmtMoney(refundTotal(r))}</b> is due within 14 days of the request — you may withhold it until the goods are back or proof of postage is provided.</p>`}
        <div style="margin-top:12px">${emailPreview({ subject: DEFAULT_EMAILS[tplKey].subject, ...State.settings.emails.templates[tplKey] }, branding, overrides)}</div>`,
      foot: `<button class="btn" data-close="1">Cancel</button><button class="btn primary" id="ap-confirm">Approve request</button>`,
      onMount(modal) {
        modal.querySelectorAll("[name=ap-res]").forEach((radio) => radio.addEventListener("change", () => {
          modal.querySelectorAll(".choice").forEach((c) => c.classList.toggle("selected", c.querySelector("input").checked));
        }));
        modal.querySelector("#ap-confirm").addEventListener("click", () => {
          const res = modal.querySelector("[name=ap-res]:checked")?.value ?? "return";
          approveRequest(r.id, res);
          closeModal(); toast(`${r.id} approved — customer notified`); renderNav(); rerender();
        });
      },
    });
  });

  /* --- reject ------------------------------------------------------------- */
  root.querySelector("#req-reject")?.addEventListener("click", () => {
    openModal({
      title: `Reject ${r.id}?`,
      body: `
        ${banner("warn", "Rejection is only lawful in specific cases", "Exempt goods (custom-made, perishable, unsealed hygiene items, started digital content — Art. 16) or requests outside the window. Your reason is included in the customer's email.")}
        <div class="field" style="margin-top:12px">
          <label for="rj-reason">Reason</label>
          <select class="select" id="rj-tmpl">
            <option value="">Choose a template…</option>
            <option>Request submitted outside the ${State.settings.window.days}-day withdrawal window</option>
            <option>Custom-made / personalized item — exempt under Art. 16(c)</option>
            <option>Hygiene-sealed item unsealed after delivery — exempt under Art. 16(e)</option>
            <option>Digital content already downloaded with consent — exempt under Art. 16(m)</option>
          </select>
          <textarea class="input" id="rj-reason" placeholder="Explain why this request can't be accepted…"></textarea>
        </div>`,
      foot: `<button class="btn" data-close="1">Cancel</button><button class="btn danger solid" id="rj-confirm" disabled>Reject request</button>`,
      onMount(modal) {
        const ta = modal.querySelector("#rj-reason");
        const btn = modal.querySelector("#rj-confirm");
        modal.querySelector("#rj-tmpl").addEventListener("change", (e) => {
          if (e.target.value) ta.value = e.target.value;
          btn.disabled = !ta.value.trim();
        });
        ta.addEventListener("input", () => { btn.disabled = !ta.value.trim(); });
        btn.addEventListener("click", () => {
          rejectRequest(r.id, ta.value.trim());
          closeModal(); toast(`${r.id} rejected — customer notified`); renderNav(); rerender();
        });
      },
    });
  });

  /* --- mark return received ------------------------------------------------ */
  root.querySelector("#req-received")?.addEventListener("click", () => {
    markReturnReceived(r.id);
    toast("Return marked as received — you can now issue the refund");
    renderNav(); rerender();
  });

  /* --- issue refund -------------------------------------------------------- */
  root.querySelector("#req-refund")?.addEventListener("click", () => {
    const base = r.value + (ret.refundStandardShipping ? r.shipping : 0);
    openModal({
      title: `Issue refund for ${r.id}`,
      body: `
        <dl class="kv">
          <dt>Items</dt><dd class="num">${fmtMoney(r.value)}</dd>
          <dt>Standard shipping</dt><dd class="num">${ret.refundStandardShipping ? fmtMoney(r.shipping) : "Not refunded"}</dd>
        </dl>
        <hr class="divider">
        <label class="check" style="margin-bottom:8px">
          <input type="checkbox" id="rf-deduct">
          <span class="ck-text">Deduct for diminished value<br><span class="ck-sub">Only lawful when handling went beyond checking the item — e.g. worn, washed or damaged by the customer (Art. 14(2)).</span></span>
        </label>
        <div id="rf-deduct-fields" style="display:none;margin:0 0 8px 24px">
          <div class="input-row" style="max-width:220px"><span class="muted">€</span><input class="input" type="number" min="0" max="${base}" step="0.01" id="rf-amount" value="0" aria-label="Deduction amount"></div>
          <div class="field" style="margin-top:8px"><input class="input" id="rf-why" placeholder="Reason (shown to the customer)"></div>
        </div>
        <div class="banner info" style="margin-top:6px">${I.euro}<div><div class="bn-title">Refunding <span id="rf-total" class="num">${fmtMoney(base)}</span></div><div class="bn-body">To the original payment method, as EU law requires. The customer gets the “Refund issued” email.</div></div></div>`,
      foot: `<button class="btn" data-close="1">Cancel</button><button class="btn primary" id="rf-confirm">Issue refund</button>`,
      onMount(modal) {
        const cb = modal.querySelector("#rf-deduct");
        const fields = modal.querySelector("#rf-deduct-fields");
        const amount = modal.querySelector("#rf-amount");
        const totalEl = modal.querySelector("#rf-total");
        function sync() {
          fields.style.display = cb.checked ? "" : "none";
          const ded = cb.checked ? Math.min(base, Math.max(0, parseFloat(amount.value) || 0)) : 0;
          totalEl.textContent = fmtMoney(base - ded);
        }
        cb.addEventListener("change", sync);
        amount.addEventListener("input", sync);
        modal.querySelector("#rf-confirm").addEventListener("click", () => {
          const ded = cb.checked ? Math.min(base, Math.max(0, parseFloat(amount.value) || 0)) : 0;
          const why = modal.querySelector("#rf-why").value.trim();
          if (ded > 0 && !why) { toast("Add a reason for the deduction — it's shown to the customer", { error: true }); return; }
          issueRefund(r.id, { deduction: ded, deductionReason: why });
          closeModal(); toast(`Refund of ${fmtMoney(base - ded)} issued`); renderNav(); rerender();
        });
      },
    });
  });
};