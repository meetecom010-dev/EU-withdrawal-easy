/* ==========================================================================
   Views: onboarding, home dashboard, setup guide, analytics, plan
   ========================================================================== */

const Views = {};

/* --- shared derived data -------------------------------------------------- */

function pendingRequests() {
  return State.requests.filter((r) => r.status === "pending");
}
function actionableRequests() {
  // Everything with a ticking legal clock: pending reviews + refunds due.
  return State.requests.filter((r) => r.status === "pending" || r.status === "return_received");
}
function guideSteps() {
  const g = State.guide.steps;
  return [
    {
      key: "dpa", title: "Accept the Data Processing Agreement", done: g.dpa,
      body: "Required under GDPR before EU Withdrawly can process withdrawal requests (which contain customer personal data) on your behalf.",
      actions: [{ label: "View agreement", act: "toast", msg: "DPA opens in a new tab (demo)" }],
    },
    {
      key: "button", title: "Add the withdrawal button to your storefront", done: g.button,
      body: "Since 19 June 2026, EU shops must show an easy-to-find electronic withdrawal function (Directive 2023/2673). Add the app block in your theme editor — it links to your withdrawal page and works without customer login.",
      actions: [
        { label: "Open theme editor", act: "toast", msg: "Theme editor opens in Shopify admin (demo)" },
        { label: "Preview the button", act: "nav", to: "preview-theme" },
      ],
    },
    {
      key: "orderStatus", title: "Enable the order status page form", done: g.orderStatus,
      body: "Customers can withdraw straight from their order confirmation — before the order even ships. Pre-filled with their order, no login needed.",
      actions: [
        { label: "Open checkout settings", act: "toast", msg: "Checkout settings open in Shopify admin (demo)" },
        { label: "Preview the form", act: "nav", to: "preview-order" },
      ],
    },
    {
      key: "form", title: "Review your policy & form settings", done: g.form,
      body: "Check the withdrawal window, eligibility rules, form fields and the customer-facing copy. Sensible EU defaults are already applied.",
      actions: [{ label: "Open settings", act: "nav", to: "settings" }],
    },
    {
      key: "test", title: "Send yourself a test request", done: g.test,
      body: "Run the customer flow end to end with a sample order, then find it under Requests to try approving it.",
      actions: [{ label: "Run the test flow", act: "nav", to: "preview-flow" }],
    },
  ];
}
function guideDone() { return guideSteps().filter((s) => s.done).length; }

function bindGuideCard(root, rerender) {
  root.querySelectorAll("[data-gs-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => btn.closest(".guide-step").classList.toggle("open"));
  });
  root.querySelectorAll("[data-gs-check]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.gsCheck;
      State.guide.steps[key] = !State.guide.steps[key];
      persist();
      if (State.guide.steps[key]) toast("Step marked as done");
      rerender();
    });
  });
  root.querySelectorAll("[data-gs-act]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { gsAct, gsArg } = btn.dataset;
      if (gsAct === "toast") toast(gsArg);
      else if (gsAct === "nav") go(gsArg);
    });
  });
}

function guideStepsHtml(openFirstIncomplete = true) {
  let opened = false;
  return guideSteps().map((s) => {
    const open = openFirstIncomplete && !s.done && !opened ? (opened = true, " open") : "";
    return `
      <div class="guide-step${s.done ? " done" : ""}${open}">
        <button class="gs-check${s.done ? " done" : ""}" data-gs-check="${s.key}" aria-label="${s.done ? "Mark as not done" : "Mark as done"}">${I.check}</button>
        <div class="gs-body">
          <button class="gs-title" data-gs-toggle aria-expanded="${open ? "true" : "false"}">${esc(s.title)} ${I.chevD}</button>
          <div class="gs-detail">
            <p>${s.body}</p>
            <div class="btn-group">
              ${s.actions.map((a) => `<button class="btn sm" data-gs-act="${a.act}" data-gs-arg="${esc(a.act === "nav" ? a.to : a.msg)}">${esc(a.label)}${a.act === "toast" ? " " + I.ext : ""}</button>`).join("")}
            </div>
          </div>
        </div>
      </div>`;
  }).join("");
}

/* ==========================================================================
   Onboarding
   ========================================================================== */

Views.onboarding = function (root) {
  const ob = State.onboarding;
  const s = State.settings;
  const stepNames = ["Welcome", "Your policy", "Where it appears", "Review & finish"];

  function stepper() {
    return `<div class="ob-stepper">${stepNames.map((n, i) => `
      <span class="os ${i < ob.step ? "done" : i === ob.step ? "now" : ""}"><i></i><span>${i + 1}. ${n}</span></span>`).join("")}</div>`;
  }

  function stepBody() {
    if (ob.step === 0) {
      return `
        <div class="card">
          <h2 class="card-title" style="font-size:14px">Everything you need for the EU right of withdrawal</h2>
          <p class="muted" style="margin:6px 0 10px;max-width:62ch">Since <b>19 June 2026</b>, every shop selling to EU consumers must offer an easy-to-find electronic <b>withdrawal function</b> (Directive 2023/2673), on top of the 14-day right of withdrawal. EU Withdrawly handles the button, the form, the emails and the deadlines — you just review requests.</p>
          <div class="feature-grid">
            <div class="feature">${I.bag}<div><div class="f-title">Storefront withdrawal button</div><div class="f-sub">Theme app block, visible without login</div></div></div>
            <div class="feature">${I.card}<div><div class="f-title">Order status page form</div><div class="f-sub">Withdraw before the order even ships</div></div></div>
            <div class="feature">${I.flow}<div><div class="f-title">Fulfillment holds</div><div class="f-sub">Orders pause automatically while you review</div></div></div>
            <div class="feature">${I.mail}<div><div class="f-title">Compliant, branded emails</div><div class="f-sub">Editable templates with automatic acknowledgements</div></div></div>
            <div class="feature">${I.clock}<div><div class="f-title">Deadline tracking</div><div class="f-sub">14-day refund clocks on every request</div></div></div>
            <div class="feature">${I.chart}<div><div class="f-title">Analytics</div><div class="f-sub">Reasons, countries, funnel, value</div></div></div>
          </div>
        </div>`;
    }
    if (ob.step === 1) {
      return `
        <div class="card">
          <h2 class="card-title" style="font-size:14px">Your withdrawal policy</h2>
          <p class="muted" style="margin:4px 0 14px">The EU minimum is 14 days from delivery. You can offer more — never less.</p>
          <div class="cols cols-half">
            <div class="field">
              <label for="ob-days">Withdrawal window (days after delivery)</label>
              <input id="ob-days" class="input" type="number" min="14" max="365" value="${s.window.days}">
              <span class="hint">14 is the legal minimum. Many shops offer 30 to build trust.</span>
            </div>
            <div class="field">
              <label for="ob-return-ship">Who pays return shipping?</label>
              <select id="ob-return-ship" class="select">
                <option value="customer" ${s.returns.shippingPayer === "customer" ? "selected" : ""}>The customer (EU default)</option>
                <option value="merchant" ${s.returns.shippingPayer === "merchant" ? "selected" : ""}>We do — free returns</option>
              </select>
              <span class="hint">Shown in the form and emails, as the law requires.</span>
            </div>
          </div>
          <hr class="divider">
          <div class="field">
            <span class="lbl">Where do you sell?</span>
            <div class="choice-list">
              <label class="choice boxed ${s.countryMode === "all" ? "selected" : ""}">
                <input type="radio" name="ob-cmode" value="all" ${s.countryMode === "all" ? "checked" : ""}>
                <span><span class="ch-title"><b>All 27 EU countries</b> (recommended)</span><br><span class="ch-sub">The right of withdrawal applies EU-wide.</span></span>
              </label>
              <label class="choice boxed ${s.countryMode === "custom" ? "selected" : ""}">
                <input type="radio" name="ob-cmode" value="custom" ${s.countryMode === "custom" ? "checked" : ""}>
                <span><span class="ch-title">Only specific countries</span><br><span class="ch-sub">Pick them now, or change this any time in Settings.</span></span>
              </label>
            </div>
          </div>
          <div id="ob-countries" style="margin-top:12px;${s.countryMode === "custom" ? "" : "display:none"}">
            <div class="chips">${EU_COUNTRIES.map(([code, name]) => `
              <button class="chip ${s.countries.includes(code) ? "on" : ""}" data-cc="${code}">${flag(code)} ${name}</button>`).join("")}
            </div>
          </div>
        </div>`;
    }
    if (ob.step === 2) {
      const sur = s.surfaces;
      const rows = [
        ["themeButton", "Storefront withdrawal button", "Theme app block for your footer or menus. Satisfies the 2026 withdrawal-button rule.", true],
        ["themePage", "Standalone withdrawal page", "Customers start a withdrawal with email + order number — no login needed.", true],
        ["orderStatus", "Order status page form", "Shown right after checkout and in order confirmation links.", false],
        ["checkout", "Checkout notice", "One-line reminder of the 14-day right at checkout (where supported).", false],
      ];
      return `
        <div class="card">
          <h2 class="card-title" style="font-size:14px">Where customers can withdraw</h2>
          <p class="muted" style="margin:4px 0 6px">Turn on the surfaces you want. You can preview each one before publishing.</p>
          ${rows.map(([key, t, sub, rec]) => `
            <div class="toggle-row">
              <label class="switch"><input type="checkbox" data-surface="${key}" ${sur[key] ? "checked" : ""}><span class="knob"></span></label>
              <div class="tr-text">
                <div class="tr-title">${t} ${rec ? '<span class="badge brand">Required for compliance</span>' : ""}</div>
                <div class="tr-sub">${sub}</div>
              </div>
              <button class="btn sm" data-preview="${key}">Preview</button>
            </div>`).join("")}
        </div>`;
    }
    const summary = [
      ["Withdrawal window", `${s.window.days} days after delivery`],
      ["Return shipping", s.returns.shippingPayer === "customer" ? "Customer pays" : "You pay (free returns)"],
      ["Countries", s.countryMode === "all" ? "All 27 EU countries" : `${s.countries.length} selected`],
      ["Storefront button", s.surfaces.themeButton ? "On" : "Off"],
      ["Order status form", s.surfaces.orderStatus ? "On" : "Off"],
      ["Acknowledgement emails", "Automatic (required)"],
    ];
    return `
      <div class="card">
        <h2 class="card-title" style="font-size:14px">Review & finish</h2>
        <dl class="kv" style="margin:12px 0 4px;max-width:420px">
          ${summary.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}
        </dl>
        <hr class="divider">
        <label class="check">
          <input type="checkbox" id="ob-dpa" ${ob.dpa ? "checked" : ""}>
          <span class="ck-text">I accept the <a href="#" data-toast="DPA opens in a new tab (demo)">Data Processing Agreement</a>
            <br><span class="ck-sub">Required so we can process withdrawal requests (customer personal data) on your behalf under GDPR.</span></span>
        </label>
        <div style="margin-top:14px">${banner("info", "Two steps stay on your list", "Adding the theme block and running a test flow finish in your theme editor — the setup guide on your dashboard walks you through both.")}</div>
      </div>`;
  }

  root.innerHTML = `
    <div class="page ob-shell">
      <div class="ob-hero">
        <span class="badge brand" style="margin-bottom:8px">${flag("EU")} EU Withdrawly</span>
        <h1>Set up your EU withdrawal process in about 3 minutes</h1>
        <p>Guided setup with compliant defaults — 14-day window, all EU countries, automatic confirmations. Everything can be changed later in Settings.</p>
      </div>
      ${stepper()}
      ${stepBody()}
      <div class="ob-foot">
        ${ob.step > 0 ? `<button class="btn" id="ob-back">Back</button>` : ""}
        <span class="spacer"></span>
        <button class="btn ghost" id="ob-skip">Skip setup</button>
        <button class="btn primary lg" id="ob-next" ${ob.step === 3 && !ob.dpa ? "disabled" : ""}>
          ${["Start setup", "Continue", "Continue", "Finish & open dashboard"][ob.step]}
        </button>
      </div>
    </div>`;

  const rerender = () => Views.onboarding(root);

  root.querySelector("#ob-back")?.addEventListener("click", () => { ob.step -= 1; persist(); rerender(); });
  root.querySelector("#ob-skip").addEventListener("click", () => finish(true));
  root.querySelector("#ob-next").addEventListener("click", () => {
    if (ob.step === 1) {
      s.window.days = Math.max(14, parseInt(root.querySelector("#ob-days").value || "14", 10));
      s.returns.shippingPayer = root.querySelector("#ob-return-ship").value;
    }
    if (ob.step < 3) { ob.step += 1; persist(); rerender(); }
    else finish(false);
  });

  function finish(skipped) {
    ob.completed = true;
    State.guide.steps.dpa = ob.dpa || !skipped;
    State.guide.steps.form = !skipped;
    persist();
    go("home");
    toast(skipped ? "Setup skipped — finish it any time from the setup guide" : "Setup complete — welcome to EU Withdrawly", { long: true });
  }

  root.querySelectorAll("[name=ob-cmode]").forEach((r) => r.addEventListener("change", () => {
    s.countryMode = r.value;
    if (r.value === "all") s.countries = EU_COUNTRIES.map(([c]) => c);
    persist(); rerender();
  }));
  root.querySelectorAll("#ob-countries .chip").forEach((chip) => chip.addEventListener("click", () => {
    const cc = chip.dataset.cc;
    s.countries = s.countries.includes(cc) ? s.countries.filter((c) => c !== cc) : [...s.countries, cc];
    persist(); chip.classList.toggle("on");
  }));
  root.querySelectorAll("[data-surface]").forEach((t) => t.addEventListener("change", () => {
    s.surfaces[t.dataset.surface] = t.checked; persist();
  }));
  root.querySelectorAll("[data-preview]").forEach((b) => b.addEventListener("click", () => {
    const map = { themeButton: "preview-theme", themePage: "preview-theme", orderStatus: "preview-order", checkout: "preview-order" };
    go(map[b.dataset.preview]);
  }));
  root.querySelector("#ob-dpa")?.addEventListener("change", (e) => {
    ob.dpa = e.target.checked; persist();
    root.querySelector("#ob-next").disabled = !ob.dpa;
  });
  root.querySelectorAll("[data-toast]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault(); toast(a.dataset.toast);
  }));
};

/* ==========================================================================
   Home dashboard
   ========================================================================== */

Views.home = function (root) {
  const reqs = State.requests;
  const pending = pendingRequests();
  const inProgress = reqs.filter((r) => IN_PROGRESS.includes(r.status));
  const actionable = actionableRequests();
  const urgent = actionable.filter((r) => daysLeft(r.deadlineAt) <= 5);
  const monthReqs = reqs.filter((r) => Date.now() - r.submittedAt < 30 * 86400e3);
  const decided = reqs.filter((r) => r.decidedAt);
  const approvedLike = decided.filter((r) => r.status !== "rejected");
  const approvalRate = decided.length ? Math.round((approvedLike.length / decided.length) * 100) : 0;
  const avgHours = decided.length ? Math.round(decided.reduce((s, r) => s + (r.decidedAt - r.submittedAt), 0) / decided.length / 36e5) : 0;
  const refundedValue = reqs.filter((r) => r.status === "refunded").reduce((s, r) => s + refundTotal(r), 0);
  const done = guideDone(), total = guideSteps().length;
  const showGuide = !State.guide.dismissed && done < total;
  const enabled = State.settings.enabled;

  root.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div class="ph-text">
          <h1 class="page-title">Home</h1>
          <p class="page-sub">What's happening with EU withdrawals at Nordlys Living.</p>
        </div>
        <div class="page-actions">
          <span class="badge ${enabled ? "ok" : "crit"}"><span class="dot"></span>${enabled ? "Withdrawal function live" : "Withdrawal function off"}</span>
          <button class="btn" data-nav="preview-flow">View as customer</button>
        </div>
      </div>

      ${!enabled ? `<div style="margin-bottom:14px">${banner("crit", "Your withdrawal function is turned off", `EU shops must offer an electronic withdrawal function since 19 June 2026. Turn it back on in <a href="#" data-nav="settings">Settings</a>.`)}</div>` : ""}
      ${enabled && urgent.length ? `<div style="margin-bottom:14px">${banner("warn", `${urgent.length} request${urgent.length === 1 ? "" : "s"} approaching the 14-day deadline`, `EU law requires a refund within 14 days of a withdrawal request. <a href="#" data-nav="requests">Review them now</a>.`)}</div>` : ""}

      <div class="stats">
        <div class="stat"><div class="st-label">Pending review</div><div class="st-value">${pending.length}</div><span class="st-delta ${urgent.length ? "down" : ""}">${urgent.length ? `${I.warn} ${urgent.length} urgent` : "All on track"}</span></div>
        <div class="stat"><div class="st-label">In progress</div><div class="st-value">${inProgress.length}</div><span class="st-delta">Returns on the way back</span></div>
        <div class="stat"><div class="st-label">Requests · 30 days</div><div class="st-value">${monthReqs.length}</div><span class="st-delta up">${I.up} 12% vs prior 30d</span></div>
        <div class="stat"><div class="st-label">Approval rate</div><div class="st-value">${approvalRate}%</div><span class="st-delta">${decided.length} decided</span></div>
        <div class="stat"><div class="st-label">Refunded · 30 days</div><div class="st-value">${fmtMoney(refundedValue)}</div><span class="st-delta">Avg response ${avgHours}h</span></div>
      </div>

      <div class="cols cols-2-1" style="margin-top:16px">
        <div class="stack">
          <div class="card">
            <div class="card-head">
              <div><h2 class="card-title">Withdrawal requests</h2><p class="card-sub">Last 30 days</p></div>
              <button class="btn sm" data-nav="analytics">View analytics</button>
            </div>
            <div id="home-chart"></div>
          </div>

          <div class="card flush">
            <div class="card-head">
              <div><h2 class="card-title">Needs your attention</h2><p class="card-sub">Pending reviews and refunds due, most urgent first</p></div>
              <button class="btn sm" data-nav="requests">View all</button>
            </div>
            ${actionable.length === 0 ? `
              <div class="empty" style="padding:28px">
                <div class="emp-icon">${I.check}</div>
                <div class="emp-title">All caught up</div>
                <p>New withdrawal requests will appear here the moment customers submit them.</p>
              </div>` : `
              <div class="table-scroll"><table class="data">
                <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th class="num">Value</th><th>Deadline</th></tr></thead>
                <tbody>
                  ${actionable.sort((a, b) => a.deadlineAt - b.deadlineAt).slice(0, 5).map((r) => `
                    <tr data-req="${r.id}">
                      <td><span class="cell-main">${r.orderName}</span><div class="cell-sub">${timeAgo(r.submittedAt)}</div></td>
                      <td>${flag(r.countryCode)} ${esc(r.customerName)}</td>
                      <td>${statusBadge(r.status)}</td>
                      <td class="num cell-main">${fmtMoney(r.value)}</td>
                      <td>${deadlineBadge(r)}</td>
                    </tr>`).join("")}
                </tbody>
              </table></div>`}
          </div>
        </div>

        <div class="stack">
          ${showGuide ? `
          <div class="card" id="guide-card">
            <div class="card-head">
              <div><h2 class="card-title">Setup guide</h2><p class="card-sub">${done} of ${total} done</p></div>
              <button class="btn sm ghost" id="guide-dismiss" aria-label="Dismiss setup guide">${I.x}</button>
            </div>
            <div class="progress-line" style="margin-bottom:6px"><span class="meter"><i style="width:${(done / total) * 100}%"></i></span><span class="num">${Math.round((done / total) * 100)}%</span></div>
            ${guideStepsHtml()}
          </div>` : ""}

          <div class="card">
            <div class="card-head"><h2 class="card-title">Compliance status</h2></div>
            <div style="display:flex;flex-direction:column;gap:9px">
              ${[
                [enabled && State.settings.surfaces.themeButton, "Withdrawal button (Directive 2023/2673)", enabled && State.settings.surfaces.themeButton ? "Live on your storefront" : "Not live yet"],
                [true, "14-day withdrawal window", `${State.settings.window.days}-day window configured`],
                [true, "Acknowledgement on a durable medium", "Confirmation email sent on every request"],
                [true, "Refund deadline tracking", "14-day response clocks on all requests"],
              ].map(([ok, t, sub]) => `
                <div class="row" style="align-items:flex-start;flex-wrap:nowrap">
                  <span style="color:${ok ? "var(--ok-strong)" : "#b28400"};flex:none;width:15px;height:15px;margin-top:1px">${ok ? I.check : I.warn}</span>
                  <div><div style="font-weight:550;font-size:12.5px">${t}</div><div class="muted small">${sub}</div></div>
                </div>`).join("")}
            </div>
            <hr class="divider">
            <p class="muted small">Full details under <a href="#" data-nav="settings/compliance">Settings → Compliance</a>. Not legal advice.</p>
          </div>
        </div>
      </div>
    </div>`;

  areaChart(root.querySelector("#home-chart"), State.series);
  bindGuideCard(root, () => Views.home(root));
  root.querySelector("#guide-dismiss")?.addEventListener("click", () => {
    State.guide.dismissed = true; persist();
    toast("Setup guide hidden — find it any time under Setup guide");
    Views.home(root);
  });
  root.querySelectorAll("[data-req]").forEach((tr) => tr.addEventListener("click", () => go(`requests/${tr.dataset.req}`)));
};

/* ==========================================================================
   Setup guide (full page)
   ========================================================================== */

Views.guide = function (root) {
  const done = guideDone(), total = guideSteps().length;
  root.innerHTML = `
    <div class="page narrow">
      <div class="page-head">
        <div class="ph-text">
          <h1 class="page-title">Setup guide</h1>
          <p class="page-sub">Five steps to a fully compliant withdrawal process. Each takes a minute or two.</p>
        </div>
        <div class="page-actions"><button class="btn" id="rerun-ob">Re-run onboarding</button></div>
      </div>
      ${done === total ? `<div style="margin-bottom:14px">${banner("ok", "Setup complete", "Your withdrawal process is fully configured. Requests will flow into the Requests tab.")}</div>` : ""}
      <div class="card">
        <div class="progress-line" style="margin-bottom:6px"><span class="meter"><i style="width:${(done / total) * 100}%"></i></span><span class="num">${done}/${total}</span></div>
        ${guideStepsHtml(false)}
      </div>
      <div class="card">
        <div class="card-head"><h2 class="card-title">Need a hand?</h2></div>
        <p class="muted" style="max-width:56ch">Our team answers within a few hours on business days, and the help center covers the EU rules in plain language.</p>
        <div class="btn-group" style="margin-top:10px">
          <button class="btn" data-toast="Help center opens in a new tab (demo)">Help center ${I.ext}</button>
          <button class="btn" data-toast="Support chat opens (demo)">Chat with support</button>
        </div>
      </div>
    </div>`;
  bindGuideCard(root, () => Views.guide(root));
  root.querySelector("#rerun-ob").addEventListener("click", () => {
    State.onboarding = { completed: false, step: 0, dpa: State.onboarding.dpa };
    persist(); go("home");
  });
  root.querySelectorAll("[data-toast]").forEach((b) => b.addEventListener("click", () => toast(b.dataset.toast)));
};

/* ==========================================================================
   Analytics
   ========================================================================== */

Views.analytics = function (root, params, range = 30) {
  const reqs = State.requests.filter((r) => Date.now() - r.submittedAt < range * 86400e3);
  const series = State.series.slice(-range);
  const counts = { pending: 0, in_progress: 0, refunded: 0, rejected: 0 };
  const reasons = {}, countries = {}, products = {};
  let refundedValue = 0;
  reqs.forEach((r) => {
    if (IN_PROGRESS.includes(r.status)) counts.in_progress += 1;
    else counts[r.status] = (counts[r.status] ?? 0) + 1;
    if (r.reason) reasons[r.reason] = (reasons[r.reason] || 0) + 1;
    countries[r.countryCode] = (countries[r.countryCode] || 0) + 1;
    r.items.forEach((it) => { products[it.title] = (products[it.title] || 0) + it.qty; });
    if (r.status === "refunded") refundedValue += refundTotal(r);
  });
  const reasonRows = Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([label, v]) => ({ label, v }));
  const countryRows = Object.entries(countries).sort((a, b) => b[1] - a[1]).map(([cc, v]) => ({ label: `${flag(cc)} ${COUNTRY_NAME[cc] || cc}`, v }));
  const productRows = Object.entries(products).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, v]) => ({ label, v }));
  const beforeShip = reqs.filter((r) => r.type === "before_fulfillment").length;
  const approved = reqs.filter((r) => r.status !== "pending" && r.status !== "rejected").length;
  const returned = reqs.filter((r) => ["return_received", "refunded"].includes(r.status)).length;
  const refunded = reqs.filter((r) => r.status === "refunded").length;
  const refundTimes = reqs.filter((r) => r.status === "refunded" && r.decidedAt);
  const avgRefundDays = refundTimes.length ? (refundTimes.reduce((s, r) => s + (r.decidedAt - r.submittedAt), 0) / refundTimes.length / 86400e3).toFixed(1) : "—";

  root.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div class="ph-text">
          <h1 class="page-title">Analytics</h1>
          <p class="page-sub">Understand why customers withdraw — and catch product problems (sizing, damage in transit) early.</p>
        </div>
        <div class="page-actions">
          <div class="seg" role="tablist">
            ${[7, 30].map((dd) => `<button role="tab" class="${range === dd ? "active" : ""}" data-range="${dd}">Last ${dd} days</button>`).join("")}
          </div>
          <button class="btn" id="export-csv">Export CSV</button>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><div class="st-label">Total requests</div><div class="st-value">${reqs.length}</div></div>
        <div class="stat"><div class="st-label">Caught before shipping</div><div class="st-value">${reqs.length ? Math.round((beforeShip / reqs.length) * 100) : 0}%</div><span class="st-delta">Cheapest to resolve</span></div>
        <div class="stat"><div class="st-label">Refunded value</div><div class="st-value">${fmtMoney(refundedValue)}</div></div>
        <div class="stat"><div class="st-label">Avg. days to refund</div><div class="st-value">${avgRefundDays}</div><span class="st-delta up">Well inside the 14-day limit</span></div>
        <div class="stat"><div class="st-label">Withdrawal rate</div><div class="st-value">2.4%</div><span class="st-delta up">${I.down} 0.3pt vs prior period</span></div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-head">
          <div><h2 class="card-title">Requests over time</h2><p class="card-sub">Submissions per day</p></div>
          <button class="btn sm" id="table-toggle" aria-pressed="false">View as table</button>
        </div>
        <div id="an-chart"></div>
        <div id="an-table" style="display:none" class="table-scroll"></div>
      </div>

      <div class="cols cols-half" style="margin-top:16px">
        <div class="card">
          <div class="card-head"><div><h2 class="card-title">Request funnel</h2><p class="card-sub">From submission to refund, this period</p></div></div>
          ${funnel([
            { label: "Submitted", v: reqs.length },
            { label: "Approved", v: approved },
            { label: "Returned", v: returned },
            { label: "Refunded", v: refunded },
          ])}
        </div>
        <div class="card">
          <div class="card-head"><div><h2 class="card-title">Outcomes</h2><p class="card-sub">${reqs.length} requests in this period</p></div></div>
          ${outcomeBar(counts)}
        </div>
      </div>

      <div class="cols cols-half" style="margin-top:16px">
        <div class="card">
          <div class="card-head"><div><h2 class="card-title">Top withdrawal reasons</h2><p class="card-sub">Optional field — ${reqs.length ? Math.round((reqs.filter((r) => r.reason && r.reason !== "Prefer not to say").length / reqs.length) * 100) : 0}% gave a reason</p></div></div>
          ${reasonRows.length ? hbars(reasonRows) : '<p class="muted">No data in this period.</p>'}
        </div>
        <div class="card">
          <div class="card-head"><div><h2 class="card-title">Requests by country</h2></div></div>
          ${countryRows.length ? hbars(countryRows) : '<p class="muted">No data in this period.</p>'}
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-head"><div><h2 class="card-title">Most withdrawn products</h2><p class="card-sub">Repeated appearances can signal a sizing, quality or photography problem</p></div></div>
        ${productRows.length ? hbars(productRows) : '<p class="muted">No data in this period.</p>'}
      </div>
    </div>`;

  areaChart(root.querySelector("#an-chart"), series);

  root.querySelectorAll("[data-range]").forEach((b) => b.addEventListener("click", () => Views.analytics(root, params, parseInt(b.dataset.range, 10))));

  const tbl = root.querySelector("#an-table");
  root.querySelector("#table-toggle").addEventListener("click", (e) => {
    const showTable = tbl.style.display === "none";
    tbl.style.display = showTable ? "" : "none";
    root.querySelector("#an-chart").style.display = showTable ? "none" : "";
    e.currentTarget.textContent = showTable ? "View as chart" : "View as table";
    e.currentTarget.setAttribute("aria-pressed", String(showTable));
    if (showTable && !tbl.innerHTML) {
      tbl.innerHTML = `<table class="data"><thead><tr><th>Date</th><th class="num">Requests</th></tr></thead><tbody>
        ${series.map((d) => `<tr style="cursor:default"><td>${fmtDate(d.t)}</td><td class="num">${d.v}</td></tr>`).join("")}</tbody></table>`;
    }
  });

  root.querySelector("#export-csv").addEventListener("click", () => {
    const rows = [["id", "order", "customer", "email", "country", "type", "status", "reason", "value_eur", "submitted"]];
    reqs.forEach((r) => rows.push([r.id, r.orderName, r.customerName, r.customerEmail, r.countryCode, r.type, r.status, r.reason, r.value, new Date(r.submittedAt).toISOString()]));
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "withdrawal-analytics.csv";
    a.click();
    toast("CSV exported");
  });
};

/* ==========================================================================
   Plan & billing
   ========================================================================== */

Views.plan = function (root) {
  const monthCount = State.requests.filter((r) => Date.now() - r.submittedAt < 30 * 86400e3).length;
  const plans = [
    { name: "Free", price: 0, limit: 10, features: ["10 requests / month", "Withdrawal button & form", "Order status page form", "Acknowledgement emails"] },
    { name: "Starter", price: 9, limit: 200, features: ["200 requests / month", "Everything in Free", "Fulfillment holds & auto-tagging", "Editable email templates", "Analytics & CSV export"] },
    { name: "Pro", price: 29, limit: Infinity, features: ["Unlimited requests", "Everything in Starter", "Auto-approve rules", "Priority support", "Multi-store (up to 5)"] },
  ];
  const current = plans.find((p) => p.name === State.plan) || plans[1];

  root.innerHTML = `
    <div class="page" style="max-width:52rem">
      <div class="page-head">
        <div class="ph-text">
          <h1 class="page-title">Plan</h1>
          <p class="page-sub">Every plan covers the legally required basics. Upgrade for automation and volume.</p>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div><h2 class="card-title">Usage this month</h2><p class="card-sub">${monthCount} of ${current.limit === Infinity ? "unlimited" : current.limit} requests on the ${current.name} plan</p></div></div>
        <div class="meter" style="height:8px"><i style="width:${current.limit === Infinity ? 6 : Math.min(100, (monthCount / current.limit) * 100)}%"></i></div>
      </div>
      <div class="plan-grid" style="margin-top:16px">
        ${plans.map((p) => `
          <div class="plan ${p.name === State.plan ? "current" : ""}">
            <div class="pl-name">${p.name} ${p.name === State.plan ? '<span class="badge">Current plan</span>' : ""}</div>
            <div class="pl-price">${p.price === 0 ? "Free" : `€${p.price}`}<span>${p.price ? " / month" : ""}</span></div>
            <ul>${p.features.map((f) => `<li>${I.check}${f}</li>`).join("")}</ul>
            <button class="btn ${p.name === State.plan ? "" : "primary"}" data-plan="${p.name}" ${p.name === State.plan ? "disabled" : ""}>
              ${p.name === State.plan ? "Current plan" : `Switch to ${p.name}`}
            </button>
          </div>`).join("")}
      </div>
      <p class="muted small" style="margin-top:12px">Billing runs through Shopify — charges appear on your Shopify invoice. Downgrade or cancel any time.</p>
    </div>`;

  root.querySelectorAll("[data-plan]").forEach((b) => b.addEventListener("click", () => {
    const name = b.dataset.plan;
    openModal({
      title: `Switch to ${name}?`,
      body: `<p>Shopify will ask you to approve the new subscription. The change takes effect immediately and is prorated.</p>`,
      foot: `<button class="btn" data-close="1">Cancel</button><button class="btn primary" id="confirm-plan">Approve in Shopify</button>`,
      onMount(modal) {
        modal.querySelector("#confirm-plan").addEventListener("click", () => {
          State.plan = name; persist(); closeModal();
          toast(`You're on the ${name} plan now`);
          Views.plan(root);
        });
      },
    });
  }));
};
