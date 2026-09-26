/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useEffect, useRef, useState } from "react";
import { resolveLabelsForLocale } from "../constants";

// Mirrors extensions/withdrawal-order-status 1:1 — same states (compact entry
// card, three steps with a progress bar), same rows (thumbnail + quantity
// badge + variant title + line total), same rules (Continue needs a
// selection, Confirm needs the declaration checked). Keep this file in sync
// with the extension's components when the extension changes.
//
// The same form also ships as a theme block on the storefront
// (extensions/withdrawal-theme-block). Its flow is identical except for one
// screen: a storefront visitor isn't signed in, so before Details it asks for
// name/email/order number on an unnumbered "Find your order" screen, and
// Details then shows those values instead of the ones the order status page
// already knows. The dropdown picks which of the two surfaces to preview.

const SURFACES = [
  { value: "order-status", label: "Order status page" },
  { value: "theme", label: "Storefront page (theme block)" },
];

// Sample order lines shaped like the extension's `shopify.lines` data, using
// a real product image so the preview reads like an actual order.
const SAMPLE_IMAGE =
  "https://cdn.shopify.com/s/files/1/0682/4787/9778/files/AAUvwnj0ICORVuxs41ODOvnhvedArLiSV20df7r8XBjEUQ_s900-c-k-c0x00ffffff-no-rj.jpg";
const SAMPLE_ITEMS = [
  {
    id: "1",
    title: "Fjord Table Lamp",
    variant: "Oak / Large",
    quantity: 1,
    price: 89.00,
    image: SAMPLE_IMAGE,
  },
  {
    id: "2",
    title: "Tind Candle Holder",
    variant: "Brass",
    quantity: 2,
    price: 29.45,
    image: SAMPLE_IMAGE,
  },
];

// The buyer the order status page already knows, and the values the theme
// block's lookup screen starts prefilled with.
const SAMPLE_CUSTOMER = {
  name: "Jane Doe",
  email: "jane@example.com",
  orderNumber: "#1001",
};

const STEP_LABELS = { step1: "Details", confirm: "Confirm", done: "Done" };
const STEP_NUMBERS = { step1: 1, confirm: 2, done: 3 };

function formatEUR(amount) {
  return `€${amount.toFixed(2)}`;
}

// Product image with the corner quantity badge, mirroring the extension's
// s-product-thumbnail (which shows the count badge on the order status page).
function ItemThumbnail({ image, title, quantity }) {
  return (
    <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
      <img
        src={image}
        alt={title}
        width={40}
        height={40}
        style={{
          width: 40,
          height: 40,
          objectFit: "cover",
          borderRadius: 8,
          border: "1px solid #e1e3e5",
          display: "block",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -5,
          right: -5,
          minWidth: 15,
          height: 15,
          borderRadius: 9,
          background: "#1a1a1a",
          color: "#fff",
          fontSize: 8,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1px",
        }}
      >
        {quantity}
      </div>
    </div>
  );
}

// One order line — the preview twin of the extension's OrderItemRow. Uses a
// flex layout so image, title and price stay on one row even in the narrow
// preview column: title truncates with an ellipsis, price stays pinned right.
function ItemRow({ item, checked, onToggle, readOnly }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {!readOnly && (
        <s-checkbox
          label=""
          accessibilityLabel={item.title}
          checked={checked}
          onChange={(e) => onToggle(item.id, e.currentTarget.checked)}
        ></s-checkbox>
      )}
      <ItemThumbnail image={item.image} title={item.title} quantity={item.quantity} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: 13,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.title}
          </span>
          <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 }}>
            {formatEUR(item.price)}
          </span>
        </div>
        {item.variant && (
          <div style={{ fontSize: 12, color: "#6d7175" }}>{item.variant}</div>
        )}
      </div>
    </div>
  );
}

// The extension's StepProgress: current step label, "Step N of 3", and a
// thin blue bar that fills left-to-right (1/3, 2/3, 3/3). Rendered as a flat
// custom bar rather than s-progress so it matches the customer-account
// surface's look, not the admin's pill-shaped progress element.
function StepProgress({ step }) {
  const percent = (STEP_NUMBERS[step] / 3) * 100;
  return (
    <s-stack direction="block" gap="small-200">
      <s-stack direction="inline" justifyContent="space-between" alignItems="center">
        <s-text type="strong">{STEP_LABELS[step]}</s-text>
        <s-text color="subdued">Step {STEP_NUMBERS[step]} of 3</s-text>
      </s-stack>
      <div
        role="progressbar"
        aria-valuenow={STEP_NUMBERS[step]}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-label={`Step ${STEP_NUMBERS[step]} of 3: ${STEP_LABELS[step]}`}
        style={{ height: 4, borderRadius: 999, background: "#e3e3e3", overflow: "hidden" }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: "#005bd3",
            borderRadius: 999,
            transition: "width 0.2s ease",
          }}
        ></div>
      </div>
    </s-stack>
  );
}

// The extension renders inside a plain card on the order status page — no
// browser chrome. This mirrors that card (white, subtle border, rounded)
// so the preview reads as the real embedded block, not a mockup.
function ExtensionCard({ children }) {
  return (
    <div
      style={{
        border: "1px solid #e1e3e5",
        borderRadius: 12,
        background: "#fff",
        padding: 20,
      }}
    >
      {children}
    </div>
  );
}

// Starts on the extension's compact entry card; "Start withdrawal request"
// expands into the step flow, exactly like the real order status page.
// Switching form-builder tabs on the left jumps the preview straight to that
// step so merchants can edit copy and see it immediately.
export default function LivePreview({ settings, activeTab, activeLocale }) {
  const [surface, setSurface] = useState("order-status");
  const [selectedIds, setSelectedIds] = useState(["1"]);
  // "entry" | "lookup" | "step1" | "confirm" | "done" — "lookup" only exists
  // on the theme block.
  const [previewStep, setPreviewStep] = useState("entry");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  // Mirrors the storefront: picking "Other" reveals a free-text reason field.
  const [reasonValue, setReasonValue] = useState("");
  // What the theme block's lookup screen collects. The order status page gets
  // the same values from the buyer's session instead of asking for them.
  const [lookup, setLookup] = useState(SAMPLE_CUSTOMER);
  // Don't leave the entry card on mount — only react to actual tab clicks.
  const skippedInitialTab = useRef(false);

  const isTheme = surface === "theme";

  useEffect(() => {
    if (!skippedInitialTab.current) {
      skippedInitialTab.current = true;
      return;
    }
    setPreviewStep(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (previewStep !== "confirm") setDeclarationAccepted(false);
  }, [previewStep]);

  // Resolve the copy to the language tab the merchant is editing — English base
  // with that locale's translation merged on top, exactly as the storefront
  // extension receives it — so the preview shows the translated form live.
  const { labels, reasonField } = resolveLabelsForLocale(settings, activeLocale);

  const selectedItems = SAMPLE_ITEMS.filter((item) => selectedIds.includes(item.id));
  const selectedTotal = selectedItems.reduce((total, item) => total + item.price, 0);
  const reasonOptions = reasonField.options ?? [];
  // On the theme block these are whatever the visitor just looked up; on the
  // order status page they're the buyer the session already identified.
  const buyer = isTheme ? lookup : SAMPLE_CUSTOMER;

  function toggleItem(id, checked) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  // Switching surface restarts the flow at the entry card: the two surfaces
  // don't have the same screens (only the theme block has "Find your order"),
  // and the point of switching is to walk the other one from the top.
  function changeSurface(next) {
    setSurface(next);
    setPreviewStep("entry");
    setSelectedIds(["1"]);
    setReasonValue("");
    setLookup(SAMPLE_CUSTOMER);
  }

  function updateLookup(field, value) {
    setLookup((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <s-section>
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="small-200" alignItems="center" justifyContent="space-between">
          <s-text type="strong">Live preview</s-text>
          <s-badge tone="success">Two-step compliant</s-badge>
        </s-stack>

        <s-select
          label="Preview"
          value={surface}
          onChange={(e) => changeSurface(e.currentTarget.value)}
        >
          {SURFACES.map((option) => (
            <s-option key={option.value} value={option.value}>
              {option.label}
            </s-option>
          ))}
        </s-select>

        <ExtensionCard>
          {previewStep === "entry" && (
            <s-stack direction="block" gap="small-200">
              <s-heading>{labels.step1Title}</s-heading>
              <s-paragraph color="subdued">{labels.step1Description}</s-paragraph>
              <s-stack direction="inline">
                <s-button variant="primary" onClick={() => setPreviewStep(isTheme ? "lookup" : "step1")}>
                  Start withdrawal request
                </s-button>
              </s-stack>
            </s-stack>
          )}

          {/* Theme block only, and unnumbered — the real widget doesn't show
              the step bar until Details, which is still "Step 1 of 3". */}
          {previewStep === "lookup" && (
            <s-stack direction="block" gap="small">
              <s-heading>Find your order</s-heading>
              <s-paragraph color="subdued">
                Enter your order details to start your withdrawal request.
              </s-paragraph>
              <s-text-field
                label="Full name"
                value={lookup.name}
                onInput={(e) => updateLookup("name", e.currentTarget.value)}
              ></s-text-field>
              <s-text-field
                label="Email"
                value={lookup.email}
                onInput={(e) => updateLookup("email", e.currentTarget.value)}
              ></s-text-field>
              <s-text-field
                label="Order number"
                placeholder="#1001"
                value={lookup.orderNumber}
                onInput={(e) => updateLookup("orderNumber", e.currentTarget.value)}
              ></s-text-field>
              <s-button variant="primary" onClick={() => setPreviewStep("step1")}>
                Continue
              </s-button>
            </s-stack>
          )}

          {previewStep !== "entry" && previewStep !== "lookup" && (
            <s-stack direction="block" gap="small">
              <StepProgress step={previewStep} />

              {previewStep === "step1" && (
                <>
                  <s-heading>{labels.step1Title}</s-heading>
                  <s-paragraph color="subdued">{labels.step1Description}</s-paragraph>
                  <s-text type="strong">{labels.itemSelectionHeading}</s-text>
                  <s-stack direction="block" gap="small-200">
                    {SAMPLE_ITEMS.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        checked={selectedIds.includes(item.id)}
                        onToggle={toggleItem}
                      />
                    ))}
                  </s-stack>
                  <s-text-field label="Full name" value={buyer.name} disabled></s-text-field>
                  <s-text-field label="Email" value={buyer.email} disabled></s-text-field>
                  <s-text-field
                    label="Order number"
                    value={buyer.orderNumber}
                    disabled
                  ></s-text-field>
                  {reasonField.enabled && (
                    <>
                      <s-select
                        label={reasonField.label}
                        placeholder="Select a reason (optional)"
                        value={reasonValue}
                        onChange={(e) => setReasonValue(e.currentTarget.value)}
                      >
                        {reasonOptions.map((option) => (
                          <s-option key={option} value={option}>
                            {option}
                          </s-option>
                        ))}
                        <s-option value="__other__">Other</s-option>
                      </s-select>
                      {reasonValue === "__other__" && (
                        <s-text-field
                          label="Your reason"
                          placeholder="Tell us your reason"
                        ></s-text-field>
                      )}
                    </>
                  )}
                  {selectedItems.length === 0 && (
                    <s-text color="subdued">Select at least one item to continue.</s-text>
                  )}
                  <s-button
                    variant="primary"
                    disabled={selectedItems.length === 0 || undefined}
                    onClick={() => setPreviewStep("confirm")}
                  >
                    {labels.step1ButtonLabel}
                  </s-button>
                </>
              )}

              {previewStep === "confirm" && (
                <>
                  <s-heading>{labels.confirmHeading}</s-heading>
                  <s-paragraph color="subdued">{labels.confirmMessage}</s-paragraph>
                  <s-text type="strong">Items to withdraw ({selectedItems.length})</s-text>
                  <s-stack direction="block" gap="small-200">
                    {selectedItems.map((item) => (
                      <ItemRow key={item.id} item={item} readOnly />
                    ))}
                  </s-stack>
                  <s-divider></s-divider>
                  <s-stack direction="inline" gap="base" justifyContent="space-between">
                    <s-text type="strong">Selected items total</s-text>
                    <s-text type="strong">{formatEUR(selectedTotal)}</s-text>
                  </s-stack>
                  <s-checkbox
                    label={labels.declaration}
                    checked={declarationAccepted}
                    onChange={(e) => setDeclarationAccepted(e.currentTarget.checked)}
                  ></s-checkbox>
                  <s-stack direction="inline" gap="base" justifyContent="space-between">
                    <s-button onClick={() => setPreviewStep("step1")}>Previous</s-button>
                    <s-button
                      variant="primary"
                      disabled={!declarationAccepted || undefined}
                      onClick={() => setPreviewStep("done")}
                    >
                      {labels.confirmButtonLabel}
                    </s-button>
                  </s-stack>
                </>
              )}

              {previewStep === "done" && (
                <>
                  <s-banner tone="success" heading={labels.submittedTitle}></s-banner>
                  <s-paragraph color="subdued">{labels.submittedMessage}</s-paragraph>
                  <s-stack direction="inline" gap="small-200" alignItems="center">
                    <s-icon type="check-circle-filled" tone="success" size="small"></s-icon>
                    <s-text color="subdued">
                      Submitted on {new Date().toLocaleDateString()}
                    </s-text>
                  </s-stack>
                  <s-text type="strong">Items to withdraw ({selectedItems.length})</s-text>
                  <s-stack direction="block" gap="small-200">
                    {selectedItems.map((item) => (
                      <ItemRow key={item.id} item={item} readOnly />
                    ))}
                  </s-stack>
                  <s-divider></s-divider>
                  <s-stack direction="inline" gap="base" justifyContent="space-between">
                    <s-text type="strong">Selected items total</s-text>
                    <s-text type="strong">{formatEUR(selectedTotal)}</s-text>
                  </s-stack>
                </>
              )}
            </s-stack>
          )}
        </ExtensionCard>

        <s-banner tone="info">
          {isTheme
            ? "This is the flow customers see in the theme block on your storefront. It adds a “Find your order” step first, because a storefront visitor isn’t signed in."
            : "This is the exact flow customers see on the order status page. Click through it here, or use the form builder tabs to jump the preview to a step."}
        </s-banner>

        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-button variant="tertiary" onClick={() => setPreviewStep("entry")}>
            Restart preview
          </s-button>
          <s-text color="subdued">
            {previewStep === "entry"
              ? "Entry card"
              : previewStep === "lookup"
                ? "Find your order"
                : `Step ${STEP_NUMBERS[previewStep]} of 3`}
          </s-text>
        </s-stack>
      </s-stack>
    </s-section>
  );
}
