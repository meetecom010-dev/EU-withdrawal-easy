/* ==========================================================================
   Router + navigation + app shell wiring
   ========================================================================== */

const NAV_ADMIN = [
  ["home", "Home", I.home],
  ["requests", "Requests", I.inbox],
  ["analytics", "Analytics", I.chart],
  ["settings", "Settings", I.cog],
  ["guide", "Setup guide", I.list],
  ["plan", "Plan", I.card],
];
const NAV_PREVIEW = [
  ["preview-theme", "Withdrawal button", I.paint],
  ["preview-order", "Order status form", I.bag],
  ["preview-flow", "Customer flow demo", I.flow],
];

function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, "");
  return hash || "home";
}

function go(path) {
  if (currentRoute() === path) route();
  else location.hash = "/" + path;
}

function renderNav() {
  const route = currentRoute();
  const pending = State.requests.filter((r) => r.status === "pending").length;
  const mk = ([key, label, icon]) => `
    <button class="nav-item ${route === key || (key === "requests" && route.startsWith("requests")) || (key === "settings" && route.startsWith("settings")) ? "active" : ""}" data-nav="${key}">
      ${icon}<span>${label}</span>
      ${key === "requests" && pending ? `<span class="nav-count num">${pending}</span>` : ""}
    </button>`;
  document.getElementById("nav-admin").innerHTML = NAV_ADMIN.map(mk).join("");
  document.getElementById("nav-preview").innerHTML = NAV_PREVIEW.map(mk).join("");
}

function route() {
  const content = document.getElementById("content");
  const r = currentRoute();

  hideSaveBar();
  closeModal();
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("scrim")?.classList.remove("show");

  if (!State.onboarding.completed) {
    document.getElementById("sidebar").style.display = "none";
    Views.onboarding(content);
    window.scrollTo(0, 0);
    return;
  }
  document.getElementById("sidebar").style.display = "";

  const reqMatch = r.match(/^requests\/(.+)$/);
  const setMatch = r.match(/^settings\/(.+)$/);
  if (reqMatch) Views.requestDetail(content, { id: reqMatch[1] });
  else if (setMatch) Views.settings(content, { tab: setMatch[1] });
  else {
    const map = {
      home: Views.home, requests: Views.requests, analytics: Views.analytics,
      settings: Views.settings, guide: Views.guide, plan: Views.plan,
      "preview-theme": Views.previewTheme, "preview-order": Views.previewOrder, "preview-flow": Views.previewFlow,
    };
    (map[r] || Views.home)(content);
  }
  renderNav();
  window.scrollTo(0, 0);
  content.focus({ preventScroll: true });
}

/* Reset settings draft when leaving the settings area entirely */
window.addEventListener("hashchange", () => {
  if (!currentRoute().startsWith("settings") && SettingsCtl.draft && !settingsDirty()) {
    SettingsCtl.draft = null;
  }
  route();
});

/* Delegated nav clicks (works for links rendered inside any view) */
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-nav]");
  if (el) { e.preventDefault(); go(el.dataset.nav); }
});

/* Mobile menu */
(function initMobileMenu() {
  const topbarLeft = document.querySelector(".tb-left");
  const btn = document.createElement("button");
  btn.id = "menu-toggle";
  btn.setAttribute("aria-label", "Toggle navigation");
  btn.innerHTML = I.menu;
  topbarLeft.prepend(btn);

  const scrim = document.createElement("div");
  scrim.id = "scrim";
  document.body.appendChild(scrim);

  btn.addEventListener("click", () => {
    const sb = document.getElementById("sidebar");
    const open = sb.classList.toggle("open");
    scrim.classList.toggle("show", open);
  });
  scrim.addEventListener("click", () => {
    document.getElementById("sidebar").classList.remove("open");
    scrim.classList.remove("show");
  });
})();

document.getElementById("reset-demo").addEventListener("click", () => {
  openModal({
    title: "Reset demo data?",
    body: `<p style="font-size:13px">This clears all changes you've made in the prototype — settings, decisions, notes, onboarding — and reseeds the sample data.</p>`,
    foot: `<button class="btn" data-close="1">Cancel</button><button class="btn danger solid" id="reset-go">Reset everything</button>`,
    onMount(m) { m.querySelector("#reset-go").addEventListener("click", resetDemo); },
  });
});

renderNav();
route();
