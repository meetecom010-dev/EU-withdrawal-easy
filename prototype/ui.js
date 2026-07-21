/* ==========================================================================
   Shared UI: icons, toasts, modals, save bar, badges, charts
   ========================================================================== */

const I = {
  home: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9.4 2.3a1 1 0 0 1 1.2 0l6.5 5a1 1 0 0 1 .4.8V16a1.5 1.5 0 0 1-1.5 1.5h-3a1 1 0 0 1-1-1V13a1.5 1.5 0 0 0-3 0v3.5a1 1 0 0 1-1 1H5A1.5 1.5 0 0 1 3.5 16V8.1a1 1 0 0 1 .4-.8l5.5-5z"/></svg>',
  inbox: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M4.6 3.5A2 2 0 0 1 6.5 2h7a2 2 0 0 1 1.9 1.5l1.9 6.1c.13.4.2.83.2 1.25V15a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 15v-4.15c0-.42.07-.84.2-1.25l1.9-6.1zm1.9.5a.5.5 0 0 0-.48.36L4.4 9.5h2.85a1 1 0 0 1 .9.55 2.06 2.06 0 0 0 3.7 0 1 1 0 0 1 .9-.55h2.85l-1.62-5.14a.5.5 0 0 0-.48-.36h-7z"/></svg>',
  chart: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a1 1 0 0 1 1 1v10.5a.5.5 0 0 0 .5.5H16a1 1 0 1 1 0 2H5.5A2.5 2.5 0 0 1 3 14.5V4a1 1 0 0 1 1-1zm12.7 2.7a1 1 0 0 1 0 1.4l-3.5 3.5a1 1 0 0 1-1.4 0L10 8.8l-2.3 2.3a1 1 0 0 1-1.4-1.4l3-3a1 1 0 0 1 1.4 0l1.8 1.8 2.8-2.8a1 1 0 0 1 1.4 0z"/></svg>',
  cog: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.34 2.7a1.8 1.8 0 0 1 3.32 0l.3.73a1.8 1.8 0 0 0 2.1.86l.76-.2a1.8 1.8 0 0 1 1.66 2.88l-.46.62a1.8 1.8 0 0 0 0 2.42l.46.62a1.8 1.8 0 0 1-1.66 2.88l-.76-.2a1.8 1.8 0 0 0-2.1.86l-.3.72a1.8 1.8 0 0 1-3.32 0l-.3-.72a1.8 1.8 0 0 0-2.1-.86l-.76.2A1.8 1.8 0 0 1 3.28 8.6l.46-.61a1.8 1.8 0 0 0 0-2.42l-.46-.62A1.8 1.8 0 0 1 4.94 2.1l.76.2a1.8 1.8 0 0 0 2.1-.86l.3-.73zM10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>',
  list: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 4.5a1 1 0 0 1 1-1h9a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1zm0 5.5a1 1 0 0 1 1-1h9a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1zm1 4.5a1 1 0 1 0 0 2h9a1 1 0 1 0 0-2H7zM3.5 5.6a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2zm1.1 4.4a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zm-1.1 6.6a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2z"/></svg>',
  card: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h11A2.5 2.5 0 0 1 18 6.5V7H2v-.5zM2 9h16v4.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 2 13.5V9zm3 3.5a1 1 0 0 0 0 2h3a1 1 0 1 0 0-2H5z"/></svg>',
  paint: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2c4.4 0 8 3.1 8 7 0 2.4-2 4.5-4.5 4.5h-1.6c-.8 0-1.4.6-1.4 1.4 0 .3.1.6.3.9.2.3.3.6.3 1 0 .7-.6 1.2-1.3 1.2-4.3-.1-7.8-3.7-7.8-8C2 6 5.6 2 10 2zM5.5 9a1.2 1.2 0 1 0 0 2.4A1.2 1.2 0 0 0 5.5 9zm3-3.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm5 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/></svg>',
  bag: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6.5 6V5a3.5 3.5 0 1 1 7 0v1H16a1 1 0 0 1 1 .9l.8 8.5A2.5 2.5 0 0 1 15.3 18H4.7a2.5 2.5 0 0 1-2.5-2.6L3 6.9A1 1 0 0 1 4 6h2.5zm2-1a1.5 1.5 0 1 1 3 0v1h-3V5z"/></svg>',
  flow: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h1A2.5 2.5 0 0 1 9 5.5v1A2.5 2.5 0 0 1 6.5 9h-1A2.5 2.5 0 0 1 3 6.5v-1zm8 9A2.5 2.5 0 0 1 13.5 12h1a2.5 2.5 0 0 1 2.5 2.5v1a2.5 2.5 0 0 1-2.5 2.5h-1a2.5 2.5 0 0 1-2.5-2.5v-1zM14 4a1 1 0 0 1 1 1v2.5A3.5 3.5 0 0 1 11.5 11H8a1 1 0 1 1 0-2h3.5A1.5 1.5 0 0 0 13 7.5V5a1 1 0 0 1 1-1zM5 12a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1z"/></svg>',
  check: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.79 6.8-6.8a1 1 0 0 1 1.4 0z"/></svg>',
  x: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4z"/></svg>',
  chevD: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M5.7 7.7a1 1 0 0 1 1.4 0L10 10.6l2.9-2.9a1 1 0 1 1 1.4 1.4l-3.6 3.6a1 1 0 0 1-1.4 0L5.7 9.1a1 1 0 0 1 0-1.4z"/></svg>',
  chevL: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M12.3 4.3a1 1 0 0 1 0 1.4L8 10l4.3 4.3a1 1 0 0 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0z"/></svg>',
  chevR: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M7.7 4.3a1 1 0 0 0 0 1.4L12 10l-4.3 4.3a1 1 0 1 0 1.4 1.4l5-5a1 1 0 0 0 0-1.4l-5-5a1 1 0 0 0-1.4 0z"/></svg>',
  ext: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 1 0 0 2h2.6l-6.3 6.3a1 1 0 0 0 1.4 1.4L15 6.4V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5zM5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 0 0 0-2H5z"/></svg>',
  info: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm1-11a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-2 3a1 1 0 0 1 2 0v4a1 1 0 1 1-2 0v-4z"/></svg>',
  warn: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M8.7 3.2a1.5 1.5 0 0 1 2.6 0l6.1 11.3A1.5 1.5 0 0 1 16.1 17H3.9a1.5 1.5 0 0 1-1.3-2.5L8.7 3.2zM10 7a1 1 0 0 0-1 1v3a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1zm0 8a1.2 1.2 0 1 0 0-2.4A1.2 1.2 0 0 0 10 15z"/></svg>',
  clock: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm1-12a1 1 0 1 0-2 0v4a1 1 0 0 0 .4.8l2.5 1.9a1 1 0 0 0 1.2-1.6L11 9.5V6z"/></svg>',
  mail: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v.4l-7 4.2-7-4.2v-.4zM3 8.2v6.3A1.5 1.5 0 0 0 4.5 16h11a1.5 1.5 0 0 0 1.5-1.5V8.2l-6.5 3.9a1 1 0 0 1-1 0L3 8.2z"/></svg>',
  euro: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M12.5 15.2c-1.9 0-3.5-1.1-4.3-2.7H12a1 1 0 1 0 0-2H7.6a5.6 5.6 0 0 1 0-1H12a1 1 0 1 0 0-2H8.2a4.75 4.75 0 0 1 8-1.2 1 1 0 0 0 1.5-1.3A6.74 6.74 0 0 0 6.1 7.5H5a1 1 0 0 0 0 2h.6a7.6 7.6 0 0 0 0 1H5a1 1 0 1 0 0 2h1.1a6.75 6.75 0 0 0 11.6 2.5 1 1 0 0 0-1.5-1.3 4.73 4.73 0 0 1-3.7 1.5z"/></svg>',
  shield: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9.7 2.1a1 1 0 0 1 .6 0l6 1.9a1 1 0 0 1 .7 1v4.3c0 4.1-2.6 7-6.6 8.6a1 1 0 0 1-.8 0C5.6 16.2 3 13.3 3 9.2V4.9a1 1 0 0 1 .7-1l6-1.8zm3.6 6.3a1 1 0 0 0-1.5-1.3l-2.6 3-1-1a1 1 0 1 0-1.4 1.4l1.8 1.8a1 1 0 0 0 1.5-.1l3.2-3.8z"/></svg>',
  send: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2.7 2.6a1 1 0 0 1 1.1-.2l13.5 6.7a1 1 0 0 1 0 1.8L3.8 17.6a1 1 0 0 1-1.4-1.2L4.6 10 2.4 3.7a1 1 0 0 1 .3-1.1zM6.4 9l-1.5 4.4L14.3 10 4.9 5.6 6.4 9z"/></svg>',
  menu: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm0 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm1 4a1 1 0 1 0 0 2h12a1 1 0 1 0 0-2H4z"/></svg>',
  download: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 0 1 1 1v7.6l2.3-2.3a1 1 0 0 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L9 10.6V3a1 1 0 0 1 1-1zM4 15a1 1 0 0 1 1 1v.5h10V16a1 1 0 1 1 2 0v1a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 17v-1a1 1 0 0 1 1-1z"/></svg>',
  up: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 4l5 6h-3v6H8v-6H5l5-6z"/></svg>',
  down: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 16l-5-6h3V4h4v6h3l-5 6z"/></svg>',
};

/* --- toast ---------------------------------------------------------------- */

function toast(msg, opts = {}) {
  const region = document.getElementById("toast-region");
  const el = document.createElement("div");
  el.className = "toast" + (opts.error ? " error" : "");
  el.innerHTML = (opts.error ? I.warn : I.check) + esc(msg);
  region.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.25s ease";
    setTimeout(() => el.remove(), 260);
  }, opts.long ? 4200 : 2600);
}

/* --- modal ---------------------------------------------------------------- */

function openModal({ title, body, foot, wide, onMount }) {
  const slot = document.getElementById("modal-slot");
  slot.innerHTML = `
    <div class="modal-scrim" data-close="1">
      <div class="modal${wide ? " wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-head">
          <h3>${esc(title)}</h3>
          <button class="modal-x" data-close="1" aria-label="Close">${I.x}</button>
        </div>
        <div class="modal-body">${body}</div>
        ${foot ? `<div class="modal-foot">${foot}</div>` : ""}
      </div>
    </div>`;
  const scrim = slot.querySelector(".modal-scrim");
  scrim.addEventListener("click", (e) => {
    if (e.target.dataset.close) closeModal();
  });
  document.addEventListener("keydown", escClose);
  slot.querySelector(".modal").querySelector("button, input, select, textarea")?.focus();
  if (onMount) onMount(slot.querySelector(".modal"));
}
function escClose(e) { if (e.key === "Escape") closeModal(); }
function closeModal() {
  document.getElementById("modal-slot").innerHTML = "";
  document.removeEventListener("keydown", escClose);
}

/* --- contextual save bar -------------------------------------------------- */

function showSaveBar({ onSave, onDiscard, saving = false }) {
  const slot = document.getElementById("savebar-slot");
  slot.innerHTML = `
    <div class="savebar">
      <span class="sv-dot"></span>
      <span class="sv-msg">Unsaved changes</span>
      <span class="spacer"></span>
      <button class="btn" id="sv-discard" ${saving ? "disabled" : ""}>Discard</button>
      <button class="btn primary" id="sv-save" ${saving ? "disabled" : ""}>${saving ? "Saving…" : "Save"}</button>
    </div>`;
  slot.querySelector("#sv-save").addEventListener("click", onSave);
  slot.querySelector("#sv-discard").addEventListener("click", onDiscard);
}
function hideSaveBar() {
  document.getElementById("savebar-slot").innerHTML = "";
}

/* --- request lifecycle ----------------------------------------------------- */

const STATUS = {
  pending: { label: "Pending review", tone: "warn" },
  awaiting_return: { label: "Awaiting return", tone: "info" },
  return_received: { label: "Return received", tone: "attn" },
  refunded: { label: "Refunded", tone: "ok" },
  rejected: { label: "Rejected", tone: "crit" },
};
const IN_PROGRESS = ["awaiting_return", "return_received"];

function statusBadge(status) {
  const s = STATUS[status] || { label: status, tone: "" };
  return `<span class="badge ${s.tone}"><span class="dot"></span>${s.label}</span>`;
}
function typeBadge(type) {
  return type === "before_fulfillment"
    ? `<span class="badge info">Before shipping</span>`
    : `<span class="badge">After delivery</span>`;
}
/* The clock that matters right now, per lifecycle stage. */
function deadlineBadge(req) {
  if (req.status === "pending" || req.status === "return_received") {
    const d = daysLeft(req.deadlineAt);
    const label = req.status === "pending" ? "to respond" : "to refund";
    if (d <= 0) return `<span class="badge crit">${I.clock} Overdue</span>`;
    if (d <= 3) return `<span class="badge crit">${I.clock} ${d}d ${label}</span>`;
    if (d <= 7) return `<span class="badge warn">${d}d ${label}</span>`;
    return `<span class="badge">${d}d ${label}</span>`;
  }
  if (req.status === "awaiting_return" && req.returnDueAt) {
    const d = daysLeft(req.returnDueAt);
    return `<span class="badge">${d <= 0 ? "Return overdue" : `${d}d for return`}</span>`;
  }
  return "";
}

function banner(tone, title, body, iconOverride) {
  const icons = { ok: I.check, warn: I.warn, crit: I.warn, info: I.info, brand: I.shield, neutral: I.info };
  return `
    <div class="banner ${tone}">
      ${iconOverride || icons[tone] || I.info}
      <div>
        <div class="bn-title">${title}</div>
        ${body ? `<div class="bn-body">${body}</div>` : ""}
      </div>
    </div>`;
}

/* ==========================================================================
   Charts — thin marks, hover tooltips, direct end labels (see dataviz specs)
   ========================================================================== */

/* Area/line chart for the 30-day series. Renders into `el`, single series. */
function areaChart(el, series, { color = "var(--c-series)", height = 150 } = {}) {
  const W = 640, H = height, padL = 30, padR = 14, padT = 12, padB = 22;
  const max = Math.max(4, ...series.map((d) => d.v));
  const iw = W - padL - padR, ih = H - padT - padB;
  const px = (i) => padL + (i / (series.length - 1)) * iw;
  const py = (v) => padT + ih - (v / max) * ih;

  let path = "", area = "";
  series.forEach((d, i) => {
    path += `${i ? "L" : "M"}${px(i).toFixed(1)},${py(d.v).toFixed(1)}`;
  });
  area = path + `L${px(series.length - 1).toFixed(1)},${(padT + ih).toFixed(1)}L${px(0).toFixed(1)},${(padT + ih).toFixed(1)}Z`;

  const gridLines = [0, 0.5, 1].map((f) => {
    const y = py(max * f).toFixed(1);
    return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--border)" stroke-width="1"/>
            <text x="${padL - 6}" y="${+y + 3}" text-anchor="end" font-size="9.5" fill="var(--sub)">${Math.round(max * f)}</text>`;
  }).join("");

  const xLabels = [0, 10, 20, 29].map((i) =>
    `<text x="${px(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="9.5" fill="var(--sub)">${fmtDate(series[i].t)}</text>`
  ).join("");

  const last = series[series.length - 1];
  el.innerHTML = `
    <div class="chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Withdrawal requests over the last 30 days">
        ${gridLines}
        <path d="${area}" fill="${color}" opacity="0.08"/>
        <path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="${px(series.length - 1)}" cy="${py(last.v)}" r="3.5" fill="${color}" stroke="var(--surface)" stroke-width="2"/>
        <line id="ac-cross" x1="0" y1="${padT}" x2="0" y2="${padT + ih}" stroke="var(--border-strong)" stroke-width="1" opacity="0"/>
        <circle id="ac-dot" r="4" fill="${color}" stroke="var(--surface)" stroke-width="2" opacity="0"/>
        ${xLabels}
        <rect id="ac-hit" x="${padL}" y="0" width="${iw}" height="${H}" fill="transparent"/>
      </svg>
      <div class="chart-tip" id="ac-tip"></div>
    </div>`;

  const svg = el.querySelector("svg");
  const hit = el.querySelector("#ac-hit");
  const cross = el.querySelector("#ac-cross");
  const dot = el.querySelector("#ac-dot");
  const tip = el.querySelector("#ac-tip");

  function move(e) {
    const r = svg.getBoundingClientRect();
    const sx = (e.clientX - r.left) * (W / r.width);
    const i = Math.max(0, Math.min(series.length - 1, Math.round(((sx - padL) / iw) * (series.length - 1))));
    const d = series[i];
    cross.setAttribute("x1", px(i)); cross.setAttribute("x2", px(i)); cross.setAttribute("opacity", "1");
    dot.setAttribute("cx", px(i)); dot.setAttribute("cy", py(d.v)); dot.setAttribute("opacity", "1");
    tip.innerHTML = `<span class="tip-label">${fmtDate(d.t)}</span> · ${d.v} request${d.v === 1 ? "" : "s"}`;
    tip.style.left = `${(px(i) / W) * r.width}px`;
    tip.style.top = `${(py(d.v) / H) * r.height}px`;
    tip.classList.add("show");
  }
  function leave() {
    cross.setAttribute("opacity", "0"); dot.setAttribute("opacity", "0"); tip.classList.remove("show");
  }
  hit.addEventListener("mousemove", move);
  hit.addEventListener("mouseleave", leave);
}

/* Horizontal bar rows (single hue) with counts. items: [{label, v}] */
function hbars(items, { color = "var(--c-series)" } = {}) {
  const max = Math.max(1, ...items.map((d) => d.v));
  return items.map((d) => `
    <div class="hbar-row" title="${esc(d.label)}: ${d.v}">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d.label)}</span>
      <span class="hbar-track"><i class="hbar-fill" style="width:${(d.v / max) * 100}%;background:${color}"></i></span>
      <span class="hbar-val">${d.v}</span>
    </div>`).join("");
}

/* Single stacked outcome bar with 2px gaps + legend (status palette).
   Segment order matches the validated palette adjacency (blue→green→amber→red). */
function outcomeBar(counts) {
  const segs = [
    { key: "in_progress", label: "In progress", color: "var(--c-series)", v: counts.in_progress },
    { key: "refunded", label: "Refunded", color: "var(--c-ok)", v: counts.refunded },
    { key: "pending", label: "Pending", color: "var(--c-warn)", v: counts.pending },
    { key: "rejected", label: "Rejected", color: "var(--c-crit)", v: counts.rejected },
  ].filter((s) => s.v > 0);
  const total = segs.reduce((s, x) => s + x.v, 0) || 1;
  return `
    <div style="display:flex;gap:2px;height:16px;border-radius:5px;overflow:hidden" role="img" aria-label="Outcomes: ${segs.map((s) => `${s.label} ${s.v}`).join(", ")}">
      ${segs.map((s) => `<div style="flex:${s.v};background:${s.color}" title="${s.label}: ${s.v}"></div>`).join("")}
    </div>
    <div class="legend" style="margin-top:9px">
      ${segs.map((s) => `<span class="lg-item"><span class="lg-swatch" style="background:${s.color}"></span>${s.label} <b class="num">${s.v}</b> <span class="muted">(${Math.round((s.v / total) * 100)}%)</span></span>`).join("")}
    </div>`;
}

/* Deadline ring for request detail */
function deadlineRing(req) {
  const total = 14;
  const left = Math.max(0, daysLeft(req.deadlineAt));
  const frac = Math.max(0, Math.min(1, left / total));
  const R = 20, C = 2 * Math.PI * R;
  const color = left <= 3 ? "var(--crit-strong)" : left <= 7 ? "#b28400" : "var(--ok-strong)";
  const what = req.status === "return_received" ? "to issue the refund" : "to respond & refund";
  return `
    <div class="deadline">
      <div class="dl-ring">
        <svg viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="${R}" fill="none" stroke="var(--border)" stroke-width="5"/>
          <circle cx="24" cy="24" r="${R}" fill="none" stroke="${color}" stroke-width="5"
            stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"/>
        </svg>
      </div>
      <div>
        <div class="dl-num num">${left} day${left === 1 ? "" : "s"} left</div>
        <div class="muted small">${what} (Art. 13: within 14 days of the request)</div>
      </div>
    </div>`;
}

/* Funnel rows (submitted -> approved -> returned -> refunded) */
function funnel(rows) {
  const max = Math.max(1, ...rows.map((r) => r.v));
  return rows.map((r, i) => `
    <div class="funnel-row" title="${esc(r.label)}: ${r.v}">
      <span>${esc(r.label)}</span>
      <span class="funnel-track"><i class="funnel-fill" style="width:${(r.v / max) * 100}%"></i></span>
      <span class="funnel-val">${r.v} <span>${i === 0 ? "" : `· ${Math.round((r.v / max) * 100)}%`}</span></span>
    </div>`).join("");
}

/* Branded email preview from a template + branding config. */
function emailPreview(tpl, branding, overrides = {}) {
  return `
    <div class="email-preview">
      <div class="ep-meta">From: ${esc(branding.fromName)} &lt;no-reply@euwithdrawly.app&gt; · Reply-to: ${esc(branding.replyTo)}<br>
        Subject: <b style="color:var(--ink)">${esc(fillVariables(tpl.subject, overrides))}</b></div>
      ${branding.showLogo ? `<div class="ep-brand"><span class="ep-logo"><i style="background:${esc(branding.accent)}"></i>${esc(branding.fromName)}</span></div>` : ""}
      <div class="ep-rule" style="background:${esc(branding.accent)}"></div>
      <div class="ep-body">${esc(fillVariables(tpl.body, overrides))}</div>
    </div>`;
}
