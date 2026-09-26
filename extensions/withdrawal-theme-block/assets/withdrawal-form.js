/**
 * Storefront withdrawal/return form — theme app extension version of
 * extensions/withdrawal-order-status's WithdrawalForm.jsx, reimplemented in plain
 * JS/DOM because Polaris web components (<s-*>) only exist inside the
 * checkout/customer-account UI extension sandbox, not on a storefront page.
 *
 * Mirrors that extension's screens (entry card -> Details -> Confirm -> Done)
 * and copy 1:1 (see STRINGS below, copied from
 * extensions/withdrawal-order-status/locales/en.default.json) so both surfaces
 * feel like the same product. The one structural difference: the order-status
 * page already knows the buyer (session token + confirmation number), so its
 * Details step shows locked, pre-filled name/email/order fields. A storefront
 * visitor is anonymous, so this flow asks for those first, in their own
 * "look up your order" step between the entry card and Details — everything
 * after that (Details/Confirm/Done, still "Step X of 3") matches exactly.
 */
(function () {
  "use strict";

  // Fallback only. The real base comes from the block’s "App proxy subpath"
  // setting (data-proxy-base): each app — withdrawl-easy-rm and
  // withdrawl-easy-mr — is proxied under its own subpath, and both can be
  // installed on the same dev store.
  const DEFAULT_PROXY_BASE = "/apps/withdrawl-easy";
  const OTHER_REASON_VALUE = "__other__";

  function trimTrailingSlash(value) {
    const base = String(value);
    return base.endsWith("/") ? base.slice(0, -1) : base;
  }

  // Copied verbatim from extensions/withdrawal-order-status/locales/en.default.json
  // so the two surfaces read identically. This surface's chrome is
  // English-only for now (the merchant's own copy — headings, reasons,
  // declaration — already comes through localized via /form-settings).
  const STRINGS = {
    entryStart: "Start withdrawal request",
    lookupHeading: "Find your order",
    lookupSub: "Enter your order details to start your withdrawal request.",
    fieldName: "Full name",
    fieldEmail: "Email",
    fieldOrderNumber: "Order number",
    lookupContinue: "Continue",
    lookingUp: "Looking up…",
    reasonPlaceholder: "Select a reason (optional)",
    otherOption: "Other",
    otherReasonLabel: "Your reason",
    otherReasonPlaceholder: "Tell us your reason",
    selectItem: "Select at least one item to continue.",
    itemsToWithdraw: (n) => `Items to withdraw (${n})`,
    selectedTotal: "Selected items total",
    previous: "Previous",
    submittedOn: (date) => `Submitted on ${date}`,
    submitting: "Submitting…",
    stepLookup: "Look up",
    stepDetails: "Details",
    stepConfirm: "Confirm",
    stepDone: "Done",
    stepOf: (current, total) => `Step ${current} of ${total}`,
    fallbackTitle: "Item",
    errorSubmit: "Something went wrong submitting your request. Please try again.",
    orderNotFound: "We couldn't find an order matching those details.",
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
      switch (char) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        default:
          return "&#39;";
      }
    });
  }

  function formatMoney(price) {
    if (!price || price.amount == null) return "";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: price.currencyCode,
      }).format(price.amount);
    } catch {
      return `${price.amount} ${price.currencyCode ?? ""}`.trim();
    }
  }

  function sumMoney(items) {
    const priced = items.filter((item) => item.price);
    if (!priced.length) return null;
    const currencyCode = priced[0].price.currencyCode;
    const amount = priced.reduce((total, item) => total + item.price.amount, 0);
    return { amount, currencyCode };
  }

  function formatSubmittedDate(date) {
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date);
    } catch {
      return date.toLocaleDateString();
    }
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `Request failed (${response.status})`);
      error.code = data.code || null;
      throw error;
    }
    return data;
  }

  // The step header + progress bar shared by Details/Confirm/Done — visual
  // equivalent of StepProgress.jsx (an <s-progress> there, a styled <div> bar
  // here, since that component doesn't exist on a storefront page).
  function stepHeaderHtml(current, total, label) {
    const percent = Math.round((current / total) * 100);
    return `
      <div class="withdrawly__stepheader">
        <div class="withdrawly__stepheader-row">
          <span class="withdrawly__stepname">${escapeHtml(label)}</span>
          <span class="withdrawly__stepof">${escapeHtml(STRINGS.stepOf(current, total))}</span>
        </div>
        <div class="withdrawly__progress">
          <div class="withdrawly__progress-fill" style="width:${percent}%"></div>
        </div>
      </div>
    `;
  }

  // One widget instance per block placement — a merchant can add this block
  // more than once on a page (unusual, but not prevented), so state lives on
  // the instance, not module-level.
  class WithdrawalWidget {
    constructor(root) {
      this.root = root;
      this.proxyBase = trimTrailingSlash(root.dataset.proxyBase || DEFAULT_PROXY_BASE);
      this.settings = null;
      this.order = null;
      this.stage = "before_delivery";
      this.items = [];
      this.selected = new Set();
      this.reason = "";
      this.otherReason = "";
      this.customerName = "";
      this.customerEmail = "";
      this.lastOrderNumber = "";
      this.submittedAt = null;
      this.submitting = false;
      // Persists across a failed-submit re-render of the Confirm step (same
      // as StepConfirm.jsx's local declarationAccepted state) — only reset
      // when actually navigating back to Details, not on a retry.
      this.declarationAccepted = false;
    }

    async init() {
      try {
        const params = new URLSearchParams({ locale: (document.documentElement.lang || "en").split("-")[0] });
        const data = await fetchJson(`${this.proxyBase}/form-settings?${params}`);
        if (!data.enabled) {
          this.root.remove();
          return;
        }
        this.settings = data;
        this.renderEntry();
      } catch (error) {
        // Fail closed and silent, same as the order-status extension: most
        // visitors will never know this feature exists, so a broken fetch
        // shouldn't leave a half-rendered error box on the page.
        console.error("[withdrawly] couldn't load form settings", error);
        this.root.remove();
      }
    }

    // Mirrors resolveLabels() in extensions/withdrawal-order-status/src/lib/labels.js
    // — swaps six keys to their delivered variant once the order's stage is
    // known; everything else is shared between both stages.
    labels() {
      const labels = this.settings?.labels ?? {};
      const delivered = this.stage === "delivered";
      return {
        title: (delivered ? labels.deliveredTitle : labels.step1Title) || "Withdraw from your purchase",
        description:
          (delivered ? labels.deliveredDescription : labels.step1Description) ||
          "You have the right to withdraw from this purchase within 14 days without giving any reason.",
        itemSelectionHeading:
          (delivered ? labels.deliveredItemSelectionHeading : labels.itemSelectionHeading) ||
          "Select the items you want to withdraw",
        confirmHeading: labels.confirmHeading || "Confirm your withdrawal",
        confirmMessage:
          (delivered ? labels.deliveredConfirmMessage : labels.confirmMessage) ||
          "Please confirm that you want to withdraw from this purchase.",
        declaration:
          labels.declaration ||
          "I hereby withdraw from the contract for the purchase of the selected item(s).",
        submittedTitle: (delivered ? labels.deliveredSubmittedTitle : labels.submittedTitle) || "Withdrawal request submitted",
        submittedMessage:
          (delivered ? labels.deliveredSubmittedMessage : labels.submittedMessage) ||
          "We've received your withdrawal request and will be in touch shortly.",
        step1ButtonLabel: labels.step1ButtonLabel || "Continue",
        confirmButtonLabel: labels.confirmButtonLabel || "Confirm withdrawal",
      };
    }

    // ---- Entry card (unnumbered, matches the order-status extension's
    // compact "Start withdrawal request" card before it expands) -----------

    renderEntry() {
      const labels = this.labels();
      this.root.innerHTML = `
        <div class="withdrawly">
          <div class="withdrawly__card">
            <h2 class="withdrawly__heading">${escapeHtml(labels.title)}</h2>
            <p class="withdrawly__sub">${escapeHtml(labels.description)}</p>
            <div class="withdrawly__actions withdrawly__actions--start">
              <button type="button" class="withdrawly__btn withdrawly__btn--primary" data-start>${escapeHtml(STRINGS.entryStart)}</button>
            </div>
          </div>
        </div>
      `;
      this.root.querySelector("[data-start]").addEventListener("click", () => this.renderLookup());
    }

    // ---- Look up (unnumbered — the one screen with no equivalent on the
    // order-status page, which already knows the buyer) ---------------------

    renderLookup(errorMessage) {
      this.root.innerHTML = `
        <div class="withdrawly">
          <div class="withdrawly__card">
            <h2 class="withdrawly__heading">${escapeHtml(STRINGS.lookupHeading)}</h2>
            <p class="withdrawly__sub">${escapeHtml(STRINGS.lookupSub)}</p>
            ${errorMessage ? `<div class="withdrawly__banner withdrawly__banner--error">${escapeHtml(errorMessage)}</div>` : ""}
            <form class="withdrawly__form" data-form="lookup">
              <label class="withdrawly__field">
                <span>${escapeHtml(STRINGS.fieldName)}</span>
                <input type="text" name="name" autocomplete="name" value="${escapeHtml(this.customerName)}" required>
              </label>
              <label class="withdrawly__field">
                <span>${escapeHtml(STRINGS.fieldEmail)}</span>
                <input type="email" name="email" autocomplete="email" value="${escapeHtml(this.customerEmail)}" required>
              </label>
              <label class="withdrawly__field">
                <span>${escapeHtml(STRINGS.fieldOrderNumber)}</span>
                <input type="text" name="orderNumber" placeholder="#1001" autocomplete="off" value="${escapeHtml(this.lastOrderNumber ?? "")}" required>
              </label>
              <div class="withdrawly__actions">
                <button type="submit" class="withdrawly__btn withdrawly__btn--primary" data-submit>${escapeHtml(STRINGS.lookupContinue)}</button>
              </div>
            </form>
          </div>
        </div>
      `;
      this.root
        .querySelector('[data-form="lookup"]')
        .addEventListener("submit", (event) => this.handleLookupSubmit(event));
    }

    async handleLookupSubmit(event) {
      event.preventDefault();
      const form = event.target;
      const formData = new FormData(form);
      this.customerName = String(formData.get("name") || "").trim();
      this.customerEmail = String(formData.get("email") || "").trim();
      this.lastOrderNumber = String(formData.get("orderNumber") || "").trim();
      const email = this.customerEmail;
      const orderNumber = this.lastOrderNumber;

      const submitBtn = form.querySelector("[data-submit]");
      submitBtn.disabled = true;
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = STRINGS.lookingUp;

      try {
        const data = await fetchJson(`${this.proxyBase}/order-lookup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: this.customerName, email, orderNumber }),
        });

        // Same client-side country gate the order-status extension applies —
        // eligibility here is otherwise identical between both surfaces, but
        // country isn't enforced server-side on either (see
        // WithdrawalNotAllowedError callers), only used to decide whether to
        // show the form at all.
        const euCountries = this.settings.euCountries ?? [];
        const countryCode = data.order.shippingAddress?.countryCode;
        if (euCountries.length && countryCode && !euCountries.includes(countryCode)) {
          this.renderLookup("This order isn't eligible for a withdrawal request.");
          return;
        }

        this.order = data.order;
        this.stage = data.stage;
        this.items = data.items ?? [];
        this.selected = new Set();
        this.renderDetails();
      } catch (error) {
        this.renderLookup(error.message || STRINGS.orderNotFound);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    }

    // ---- Item row (equivalent of OrderItemRow.jsx) -------------------------

    itemRowHtml(item, selectable) {
      const checked = this.selected.has(item.id);
      const title = item.title || STRINGS.fallbackTitle;
      return `
        <div class="withdrawly__item ${checked ? "is-selected" : ""}" data-item-row="${escapeHtml(item.id)}">
          <div class="withdrawly__item-main">
            ${
              selectable
                ? `<input type="checkbox" class="withdrawly__checkbox" data-item-checkbox value="${escapeHtml(item.id)}" aria-label="${escapeHtml(title)}" ${checked ? "checked" : ""}>`
                : ""
            }
            <span class="withdrawly__item-thumb">
              ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.imageAlt || title)}" loading="lazy">` : ""}
              <span class="withdrawly__item-qty">${escapeHtml(item.quantity)}</span>
            </span>
            <span class="withdrawly__item-info">
              <span class="withdrawly__item-title">${escapeHtml(title)}</span>
              ${item.variantTitle ? `<span class="withdrawly__item-variant">${escapeHtml(item.variantTitle)}</span>` : ""}
            </span>
          </div>
          <span class="withdrawly__item-price">${escapeHtml(formatMoney(item.price))}</span>
        </div>
      `;
    }

    reasonFieldHtml() {
      const reasonField = this.settings.reasonField ?? {};
      if (!reasonField.enabled) return "";
      const options = reasonField.options ?? [];
      return `
        <label class="withdrawly__field">
          <span>${escapeHtml(reasonField.label || "Reason for return")}</span>
          <select data-reason>
            <option value="" ${this.reason === "" ? "selected" : ""}>${escapeHtml(STRINGS.reasonPlaceholder)}</option>
            ${options
              .map(
                (option) =>
                  `<option value="${escapeHtml(option)}" ${this.reason === option ? "selected" : ""}>${escapeHtml(option)}</option>`,
              )
              .join("")}
            <option value="${OTHER_REASON_VALUE}" ${this.reason === OTHER_REASON_VALUE ? "selected" : ""}>${escapeHtml(STRINGS.otherOption)}</option>
          </select>
        </label>
        <label class="withdrawly__field" data-other-reason-field ${this.reason === OTHER_REASON_VALUE ? "" : "hidden"}>
          <span>${escapeHtml(STRINGS.otherReasonLabel)}</span>
          <input type="text" data-other-reason value="${escapeHtml(this.otherReason)}" placeholder="${escapeHtml(STRINGS.otherReasonPlaceholder)}">
        </label>
      `;
    }

    lockedFieldHtml(label, value) {
      return `
        <div class="withdrawly__field withdrawly__field--locked">
          <span>${escapeHtml(label)}</span>
          <div class="withdrawly__locked-value">${escapeHtml(value)}</div>
        </div>
      `;
    }

    // ---- Step 1 of 3: Details (item selection) — matches StepDetails.jsx --

    renderDetails() {
      const labels = this.labels();
      this.root.innerHTML = `
        <div class="withdrawly">
          <div class="withdrawly__card">
            ${stepHeaderHtml(1, 3, STRINGS.stepDetails)}
            <h2 class="withdrawly__heading">${escapeHtml(labels.title)}</h2>
            <p class="withdrawly__sub">${escapeHtml(labels.description)}</p>
            <p class="withdrawly__subheading">${escapeHtml(labels.itemSelectionHeading)}</p>
            <div class="withdrawly__items" data-items>
              ${this.items.map((item) => this.itemRowHtml(item, true)).join("")}
            </div>
            ${this.lockedFieldHtml(STRINGS.fieldName, this.customerName)}
            ${this.lockedFieldHtml(STRINGS.fieldEmail, this.customerEmail)}
            ${this.lockedFieldHtml(STRINGS.fieldOrderNumber, this.order.name)}
            ${this.reasonFieldHtml()}
            <p class="withdrawly__hint" data-hint ${this.selected.size > 0 ? "hidden" : ""}>${escapeHtml(STRINGS.selectItem)}</p>
            <div class="withdrawly__actions withdrawly__actions--start">
              <button type="button" class="withdrawly__btn withdrawly__btn--primary" data-continue ${this.selected.size === 0 ? "disabled" : ""}>${escapeHtml(labels.step1ButtonLabel)}</button>
            </div>
          </div>
        </div>
      `;

      this.root.querySelectorAll("[data-item-checkbox]").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          const id = checkbox.value;
          if (checkbox.checked) this.selected.add(id);
          else this.selected.delete(id);
          checkbox.closest("[data-item-row]").classList.toggle("is-selected", checkbox.checked);
          this.root.querySelector("[data-continue]").disabled = this.selected.size === 0;
          this.root.querySelector("[data-hint]").hidden = this.selected.size > 0;
        });
      });

      const reasonSelect = this.root.querySelector("[data-reason]");
      reasonSelect?.addEventListener("change", () => {
        this.reason = reasonSelect.value;
        this.root
          .querySelector("[data-other-reason-field]")
          .toggleAttribute("hidden", this.reason !== OTHER_REASON_VALUE);
      });
      this.root.querySelector("[data-other-reason]")?.addEventListener("input", (event) => {
        this.otherReason = event.target.value;
      });

      this.root.querySelector("[data-continue]").addEventListener("click", () => {
        if (this.selected.size === 0) return;
        this.renderConfirm();
      });
    }

    // ---- Step 2 of 3: Confirm — matches StepConfirm.jsx --------------------

    selectedItems() {
      return this.items.filter((item) => this.selected.has(item.id));
    }

    renderConfirm(errorMessage) {
      const labels = this.labels();
      const selectedItems = this.selectedItems();
      const total = sumMoney(selectedItems);
      this.root.innerHTML = `
        <div class="withdrawly">
          <div class="withdrawly__card">
            ${stepHeaderHtml(2, 3, STRINGS.stepConfirm)}
            <h2 class="withdrawly__heading">${escapeHtml(labels.confirmHeading)}</h2>
            <p class="withdrawly__sub">${escapeHtml(labels.confirmMessage)}</p>
            <p class="withdrawly__subheading">${escapeHtml(STRINGS.itemsToWithdraw(selectedItems.length))}</p>
            <div class="withdrawly__items">
              ${selectedItems.map((item) => this.itemRowHtml(item, false)).join("")}
            </div>
            ${
              total
                ? `<div class="withdrawly__total"><span>${escapeHtml(STRINGS.selectedTotal)}</span><span>${escapeHtml(formatMoney(total))}</span></div>`
                : ""
            }
            <label class="withdrawly__declaration">
              <input type="checkbox" data-declaration ${this.declarationAccepted ? "checked" : ""}>
              <span>${escapeHtml(labels.declaration)}</span>
            </label>
            ${errorMessage ? `<div class="withdrawly__banner withdrawly__banner--error">${escapeHtml(errorMessage)}</div>` : ""}
            <div class="withdrawly__actions withdrawly__actions--split">
              <button type="button" class="withdrawly__btn" data-back>${escapeHtml(STRINGS.previous)}</button>
              <button type="button" class="withdrawly__btn withdrawly__btn--primary" data-submit ${this.declarationAccepted ? "" : "disabled"}>${escapeHtml(labels.confirmButtonLabel)}</button>
            </div>
          </div>
        </div>
      `;

      this.root.querySelector("[data-back]").addEventListener("click", () => {
        this.declarationAccepted = false;
        this.renderDetails();
      });
      const submitBtn = this.root.querySelector("[data-submit]");
      this.root.querySelector("[data-declaration]").addEventListener("change", (event) => {
        this.declarationAccepted = event.target.checked;
        submitBtn.disabled = !this.declarationAccepted;
      });
      submitBtn.addEventListener("click", () => this.handleSubmit(submitBtn));
    }

    async handleSubmit(submitBtn) {
      if (this.submitting) return;
      this.submitting = true;
      submitBtn.disabled = true;
      submitBtn.classList.add("is-loading");
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = STRINGS.submitting;

      const selectedItems = this.selectedItems();
      try {
        await fetchJson(`${this.proxyBase}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: this.order.id,
            orderName: this.order.name,
            customerName: this.customerName,
            customerEmail: this.customerEmail,
            countryCode: this.order.shippingAddress?.countryCode ?? "",
            locale: (document.documentElement.lang || "en").split("-")[0],
            reason: this.reason === OTHER_REASON_VALUE ? this.otherReason.trim() : this.reason,
            shippingAddress: this.order.shippingAddress?.formatted ?? "",
            orderLineCount: this.items.length,
            items: selectedItems.map((item) => ({
              lineId: item.id,
              variantId: item.variantId ?? "",
              title: item.title,
              variantTitle: item.variantTitle,
              sku: item.sku,
              imageUrl: item.imageUrl,
              quantity: item.quantity,
              price: item.price,
            })),
          }),
        });
        this.submittedAt = new Date();
        this.renderDone();
      } catch (error) {
        this.renderConfirm(error.message || STRINGS.errorSubmit);
      } finally {
        this.submitting = false;
        submitBtn.disabled = false;
        submitBtn.classList.remove("is-loading");
        submitBtn.textContent = originalLabel;
      }
    }

    // ---- Step 3 of 3: Done — matches StepDone.jsx --------------------------

    renderDone() {
      const labels = this.labels();
      const selectedItems = this.selectedItems();
      const total = sumMoney(selectedItems);
      this.root.innerHTML = `
        <div class="withdrawly">
          <div class="withdrawly__card">
            ${stepHeaderHtml(3, 3, STRINGS.stepDone)}
            <div class="withdrawly__banner withdrawly__banner--success">${escapeHtml(labels.submittedTitle)}</div>
            <p class="withdrawly__sub">${escapeHtml(labels.submittedMessage)}</p>
            <div class="withdrawly__submitted">
              <span class="withdrawly__check" aria-hidden="true">&#10003;</span>
              <span>${escapeHtml(STRINGS.submittedOn(formatSubmittedDate(this.submittedAt ?? new Date())))}</span>
            </div>
            <p class="withdrawly__subheading">${escapeHtml(STRINGS.itemsToWithdraw(selectedItems.length))}</p>
            <div class="withdrawly__items">
              ${selectedItems.map((item) => this.itemRowHtml(item, false)).join("")}
            </div>
            ${
              total
                ? `<div class="withdrawly__total"><span>${escapeHtml(STRINGS.selectedTotal)}</span><span>${escapeHtml(formatMoney(total))}</span></div>`
                : ""
            }
          </div>
        </div>
      `;
    }
  }

  function boot() {
    document.querySelectorAll("[data-withdrawly-widget]").forEach((root) => {
      if (root.dataset.withdrawlyBooted) return;
      root.dataset.withdrawlyBooted = "true";
      new WithdrawalWidget(root).init();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
