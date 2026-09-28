/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { resolveLabelsForLocale } from "../constants";
import { useFormatters } from "../../../i18n/react";

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
//
// The form's own copy comes from the merchant's settings. The fixed storefront
// strings around it (field labels, buttons) are under formSetup.preview.storefront
// in en.json, mirroring the extensions' locale files.

// Labels are formSetup.preview.surfaces.<labelKey>.
const SURFACES = [
  { value: "order-status", labelKey: "orderStatus" },
  { value: "theme", labelKey: "theme" },
];

// Which set of merchant copy to preview. The storefront shows the "After
// delivery" fields once Shopify marks the order delivered, and the base fields
// before that. Labels are formSetup.preview.stages.<value>.
const STAGES = ["beforeDelivery", "delivered"];

// Same mapping as the extension's lib/labels.js DELIVERED_OVERRIDES — keep in
// sync. Only these labels have a delivered version; the rest are shared.
const DELIVERED_OVERRIDES = {
  step1Title: "deliveredTitle",
  step1Description: "deliveredDescription",
  itemSelectionHeading: "deliveredItemSelectionHeading",
  confirmMessage: "deliveredConfirmMessage",
  submittedTitle: "deliveredSubmittedTitle",
  submittedMessage: "deliveredSubmittedMessage",
};

function labelsForStage(labels, stage) {
  if (stage !== "delivered") return labels;
  const resolved = { ...labels };
  for (const [baseKey, deliveredKey] of Object.entries(DELIVERED_OVERRIDES)) {
    const value = labels[deliveredKey];
    if (typeof value === "string" && value.trim() !== "") resolved[baseKey] = value;
  }
  return resolved;
}

// Sample order lines shaped like the extension's `shopify.lines` data, using
// a real product image so the preview reads like an actual order. Titles and
// variants are sample.items.<sampleKey>.
const SAMPLE_IMAGE =
  "https://cdn.shopify.com/s/files/1/0682/4787/9778/files/AAUvwnj0ICORVuxs41ODOvnhvedArLiSV20df7r8XBjEUQ_s900-c-k-c0x00ffffff-no-rj.jpg";
const SAMPLE_ITEMS = [
  {
    id: "1",
    sampleKey: "lamp",
    quantity: 1,
    price: 89.00,
    image: SAMPLE_IMAGE,
  },
  {
    id: "2",
    sampleKey: "candleHolder",
    quantity: 2,
    price: 29.45,
    image: SAMPLE_IMAGE,
  },
];

// The buyer the order status page already knows, and the values the theme
// block's lookup screen starts prefilled with. The name is translated
// (sample.customerName) where it's used.
const SAMPLE_CUSTOMER = {
  email: "jane@example.com",
  orderNumber: "#1001",
};

const STEP_NUMBERS = { step1: 1, confirm: 2, done: 3 };
const STEP_COUNT = 3;

// Sample prices are in euros, the currency of the EU stores the form is for.
function useFormatEUR() {
  const { formatMoney } = useFormatters();
  return (amount) => formatMoney({ amount, currencyCode: "EUR" });
}

// The sample items with their translated title/variant.
function useSampleItems() {
  const { t } = useTranslation();
  return SAMPLE_ITEMS.map((item) => ({
    ...item,
    title: t(`sample.items.${item.sampleKey}.title`),
    variant: t(`sample.items.${item.sampleKey}.variant`),
  }));
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
  const formatEUR = useFormatEUR();
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
  const { t } = useTranslation();
  const percent = (STEP_NUMBERS[step] / STEP_COUNT) * 100;
  const label = t(`formSetup.preview.storefront.steps.${step}`);
  const position = { current: STEP_NUMBERS[step], total: STEP_COUNT };
  return (
    <s-stack direction="block" gap="small-200">
      <s-stack direction="inline" justifyContent="space-between" alignItems="center">
        <s-text type="strong">{label}</s-text>
        <s-text color="subdued">{t("formSetup.preview.storefront.stepOf", position)}</s-text>
      </s-stack>
      <div
        role="progressbar"
        aria-valuenow={STEP_NUMBERS[step]}
        aria-valuemin={0}
        aria-valuemax={STEP_COUNT}
        aria-label={t("formSetup.preview.storefront.stepProgress", { ...position, label })}
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
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const formatEUR = useFormatEUR();
  const sampleItems = useSampleItems();
  const sampleCustomer = { ...SAMPLE_CUSTOMER, name: t("sample.customerName") };
  const [surface, setSurface] = useState("order-status");
  const [stage, setStage] = useState("beforeDelivery");
  const [selectedIds, setSelectedIds] = useState(["1"]);
  // "entry" | "lookup" | "step1" | "confirm" | "done" — "lookup" only exists
  // on the theme block.
  const [previewStep, setPreviewStep] = useState("entry");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  // Mirrors the storefront: picking "Other" reveals a free-text reason field.
  const [reasonValue, setReasonValue] = useState("");
  // What the theme block's lookup screen collects. The order status page gets
  // the same values from the buyer's session instead of asking for them.
  const [lookup, setLookup] = useState(sampleCustomer);
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
  const resolved = resolveLabelsForLocale(settings, activeLocale);
  const labels = labelsForStage(resolved.labels, stage);
  const { reasonField } = resolved;

  const selectedItems = sampleItems.filter((item) => selectedIds.includes(item.id));
  const selectedTotal = selectedItems.reduce((total, item) => total + item.price, 0);
  const reasonOptions = reasonField.options ?? [];
  // On the theme block these are whatever the visitor just looked up; on the
  // order status page they're the buyer the session already identified.
  const buyer = isTheme ? lookup : sampleCustomer;

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
    setLookup(sampleCustomer);
  }

  function updateLookup(field, value) {
    setLookup((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <s-section>
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="small-200" alignItems="center" justifyContent="space-between">
          <s-text type="strong">{t("formSetup.preview.heading")}</s-text>
          <s-badge tone="success">{t("formSetup.preview.compliantBadge")}</s-badge>
        </s-stack>

        <s-select
          label={t("formSetup.preview.surfaceLabel")}
          value={surface}
          onChange={(e) => changeSurface(e.currentTarget.value)}
        >
          {SURFACES.map((option) => (
            <s-option key={option.value} value={option.value}>
              {t(`formSetup.preview.surfaces.${option.labelKey}`)}
            </s-option>
          ))}
        </s-select>

        <s-select
          label={t("formSetup.preview.stageLabel")}
          value={stage}
          onChange={(e) => setStage(e.currentTarget.value)}
        >
          {STAGES.map((value) => (
            <s-option key={value} value={value}>
              {t(`formSetup.preview.stages.${value}`)}
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
                  {t("formSetup.preview.storefront.start")}
                </s-button>
              </s-stack>
            </s-stack>
          )}

          {/* Theme block only, and unnumbered — the real widget doesn't show
              the step bar until Details, which is still "Step 1 of 3". */}
          {previewStep === "lookup" && (
            <s-stack direction="block" gap="small">
              <s-heading>{t("formSetup.preview.storefront.findOrderHeading")}</s-heading>
              <s-paragraph color="subdued">{t("formSetup.preview.storefront.findOrderBody")}</s-paragraph>
              <s-text-field
                label={t("formSetup.preview.storefront.fullName")}
                value={lookup.name}
                onInput={(e) => updateLookup("name", e.currentTarget.value)}
              ></s-text-field>
              <s-text-field
                label={t("formSetup.preview.storefront.email")}
                value={lookup.email}
                onInput={(e) => updateLookup("email", e.currentTarget.value)}
              ></s-text-field>
              <s-text-field
                label={t("formSetup.preview.storefront.orderNumber")}
                placeholder="#1001"
                value={lookup.orderNumber}
                onInput={(e) => updateLookup("orderNumber", e.currentTarget.value)}
              ></s-text-field>
              <s-button variant="primary" onClick={() => setPreviewStep("step1")}>
                {t("formSetup.preview.storefront.continue")}
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
                    {sampleItems.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        checked={selectedIds.includes(item.id)}
                        onToggle={toggleItem}
                      />
                    ))}
                  </s-stack>
                  <s-text-field label={t("formSetup.preview.storefront.fullName")} value={buyer.name} disabled></s-text-field>
                  <s-text-field label={t("formSetup.preview.storefront.email")} value={buyer.email} disabled></s-text-field>
                  <s-text-field
                    label={t("formSetup.preview.storefront.orderNumber")}
                    value={buyer.orderNumber}
                    disabled
                  ></s-text-field>
                  {reasonField.enabled && (
                    <>
                      <s-select
                        label={reasonField.label}
                        placeholder={t("formSetup.preview.storefront.reasonPlaceholder")}
                        value={reasonValue}
                        onChange={(e) => setReasonValue(e.currentTarget.value)}
                      >
                        {reasonOptions.map((option) => (
                          <s-option key={option} value={option}>
                            {option}
                          </s-option>
                        ))}
                        <s-option value="__other__">{t("formSetup.preview.storefront.otherReason")}</s-option>
                      </s-select>
                      {reasonValue === "__other__" && (
                        <s-text-field
                          label={t("formSetup.preview.storefront.yourReason")}
                          placeholder={t("formSetup.preview.storefront.yourReasonPlaceholder")}
                        ></s-text-field>
                      )}
                    </>
                  )}
                  {selectedItems.length === 0 && (
                    <s-text color="subdued">{t("formSetup.preview.storefront.selectItem")}</s-text>
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
                  <s-text type="strong">
                    {t("formSetup.preview.storefront.itemsToWithdraw", { count: selectedItems.length })}
                  </s-text>
                  <s-stack direction="block" gap="small-200">
                    {selectedItems.map((item) => (
                      <ItemRow key={item.id} item={item} readOnly />
                    ))}
                  </s-stack>
                  <s-divider></s-divider>
                  <s-stack direction="inline" gap="base" justifyContent="space-between">
                    <s-text type="strong">{t("formSetup.preview.storefront.selectedTotal")}</s-text>
                    <s-text type="strong">{formatEUR(selectedTotal)}</s-text>
                  </s-stack>
                  <s-checkbox
                    label={labels.declaration}
                    checked={declarationAccepted}
                    onChange={(e) => setDeclarationAccepted(e.currentTarget.checked)}
                  ></s-checkbox>
                  <s-stack direction="inline" gap="base" justifyContent="space-between">
                    <s-button onClick={() => setPreviewStep("step1")}>{t("formSetup.preview.storefront.previous")}</s-button>
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
                      {t("formSetup.preview.storefront.submittedOn", { date: formatDate(new Date()) })}
                    </s-text>
                  </s-stack>
                  <s-text type="strong">
                    {t("formSetup.preview.storefront.itemsToWithdraw", { count: selectedItems.length })}
                  </s-text>
                  <s-stack direction="block" gap="small-200">
                    {selectedItems.map((item) => (
                      <ItemRow key={item.id} item={item} readOnly />
                    ))}
                  </s-stack>
                  <s-divider></s-divider>
                  <s-stack direction="inline" gap="base" justifyContent="space-between">
                    <s-text type="strong">{t("formSetup.preview.storefront.selectedTotal")}</s-text>
                    <s-text type="strong">{formatEUR(selectedTotal)}</s-text>
                  </s-stack>
                </>
              )}
            </s-stack>
          )}
        </ExtensionCard>

        <s-banner tone="info">
          {isTheme ? t("formSetup.preview.banner.theme") : t("formSetup.preview.banner.orderStatus")}
        </s-banner>

        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-button variant="tertiary" onClick={() => setPreviewStep("entry")}>
            {t("formSetup.preview.restart")}
          </s-button>
          <s-text color="subdued">
            {previewStep === "entry"
              ? t("formSetup.preview.position.entry")
              : previewStep === "lookup"
                ? t("formSetup.preview.position.lookup")
                : t("formSetup.preview.position.step", { current: STEP_NUMBERS[previewStep], total: STEP_COUNT })}
          </s-text>
        </s-stack>
      </s-stack>
    </s-section>
  );
}
