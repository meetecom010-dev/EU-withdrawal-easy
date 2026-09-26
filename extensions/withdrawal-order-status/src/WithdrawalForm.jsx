import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  currentLanguage,
  fetchFormSettings,
  fetchOrderDetails,
  fetchWithdrawalEligibility,
  recordFormEvent,
  submitWithdrawalRequest,
} from "./lib/api.js";
import { resolveLabels } from "./lib/labels.js";
import { t } from "./lib/i18n.js";
import StepProgress from "./components/StepProgress.jsx";
import StepDetails, { OTHER_REASON_VALUE } from "./components/StepDetails.jsx";
import StepConfirm from "./components/StepConfirm.jsx";
import StepDone from "./components/StepDone.jsx";
import WithdrawalFormSkeleton from "./components/WithdrawalFormSkeleton.jsx";

// A per-mount id so the pre-submission funnel (button_viewed -> form_opened ->
// form_submitted) can be stitched together on the backend before a withdrawal
// request exists. randomUUID isn't guaranteed in every extension runtime, so
// there's a plain-random fallback.
function newSessionId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

const STEP_DETAILS = "details";
const STEP_CONFIRM = "confirm";
const STEP_DONE = "done";
const STEP_NUMBERS = { [STEP_DETAILS]: 1, [STEP_CONFIRM]: 2, [STEP_DONE]: 3 };

// Root of the 3-step withdrawal form shown on the order status page.
// Settings (copy, reason options) come from the merchant's saved
// configuration (app/routes/_app.form-setup) once they turn the form on and
// enable it for the order status page; item data (lines, order number,
// buyer identity) comes straight from the order-status extension API, so
// both sides of the form are backed by real, live data instead of the admin
// preview's sample order.
export default function WithdrawalForm() {
  // Set when the merchant is looking at this block in the checkout/customer
  // account editor. There the form always renders (or explains why it
  // can't), instead of vanishing like it does for an ineligible buyer.
  const inEditor = Boolean(shopify.extension?.editor);
  const [status, setStatus] = useState("loading"); // loading | ready | hidden | error
  // Why the backend reported the form as off (form_disabled | surface_disabled).
  const [disabledReason, setDisabledReason] = useState(/** @type {string | null} */ (null));
  const [settings, setSettings] = useState(null);
  // The form starts as a compact card (title + description + start button)
  // so it doesn't crowd out the actual order details on the page — the full
  // step-by-step flow only takes over once the customer opts in.
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(STEP_DETAILS);
  const [selectedLineIds, setSelectedLineIds] = useState([]);
  const [reason, setReason] = useState("");
  // The free-text reason shown when "Other" is picked, submitted in place of the
  // sentinel value.
  const [otherReason, setOtherReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(/** @type {string | null} */ (null));
  // Customer name/email resolved by our backend from the Admin API — the
  // client-side buyerIdentity hooks only exist once the app has protected
  // customer data access, so this is the reliable source for the locked,
  // prefilled fields.
  const [orderCustomer, setOrderCustomer] = useState(
    /** @type {{ customerName: string, customerEmail: string } | null} */ (null),
  );
  // Where the order is in its lifecycle, resolved by the backend on every
  // load. Drives which set of merchant copy renders, and whether the
  // withdrawal window is still open at all.
  const [eligibility, setEligibility] = useState(
    /** @type {{ isEligible: boolean, code: string | null, message: string, stage: string } | null} */ (
      null
    ),
  );
  const sessionId = useRef(newSessionId());
  // Guards so each funnel event fires at most once per mount.
  const buttonViewedSent = useRef(false);
  const formOpenedSent = useRef(false);

  useEffect(() => {
    let cancelled = false;

    fetchFormSettings()
      .then((data) => {
        if (cancelled) return;
        if (data.enabled) {
          setSettings(data);
          setStatus("ready");
        } else {
          setDisabledReason(data.disabledReason ?? "surface_disabled");
          setStatus("hidden");
        }
      })
      .catch((error) => {
        // Fail closed: a customer's order-status page shouldn't show a raw
        // error for a feature they may not even know exists. Developers can
        // still see what went wrong in the console.
        console.error("[withdrawal-form] Couldn't load form settings", error);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const lines = shopify.lines.value ?? [];
  const order = shopify.order.value;
  const orderId = order?.id ?? "";
  const confirmationNumber = order?.confirmationNumber ?? "";

  useEffect(() => {
    if (!orderId || !confirmationNumber) return undefined;
    let cancelled = false;

    fetchOrderDetails(orderId, confirmationNumber)
      .then((data) => {
        if (!cancelled) setOrderCustomer(data);
      })
      .catch((error) => {
        // Non-fatal: the form still works, the locked fields just stay empty.
        console.error("[withdrawal-form] Couldn't load order details", error);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, confirmationNumber]);

  // Keyed on the order so it re-resolves whenever the page is opened, which is
  // what makes a newly delivered order switch to the delivered copy without
  // anyone touching the settings.
  useEffect(() => {
    if (!orderId || !confirmationNumber) return undefined;
    let cancelled = false;

    fetchWithdrawalEligibility(orderId, confirmationNumber)
      .then((data) => {
        if (!cancelled) setEligibility(data);
      })
      .catch((error) => {
        // Fail open. The submission endpoint enforces the deadline server-side
        // and returns 422 regardless, so a network blip here costs the
        // delivered wording — not a customer being wrongly denied a statutory
        // right they still hold.
        console.error("[withdrawal-form] Couldn't load withdrawal eligibility", error);
        if (!cancelled) {
          setEligibility({
            isEligible: true,
            code: null,
            message: "",
            stage: "before_delivery",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, confirmationNumber]);

  // Customer identity: prefer the extension API's buyerIdentity (only
  // present when the app has protected customer data access), then the
  // shipping address name, then the backend Admin API lookup above. `||`
  // (not `??`) so an empty candidate falls through to the next source.
  const customer = shopify.buyerIdentity?.customer?.value;
  const shippingAddress = shopify.shippingAddress?.value;
  const fullName =
    customer?.fullName ||
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
    [shippingAddress?.firstName, shippingAddress?.lastName].filter(Boolean).join(" ") ||
    orderCustomer?.customerName ||
    "";
  const email =
    shopify.buyerIdentity?.email?.value ||
    customer?.email ||
    orderCustomer?.customerEmail ||
    "";
  // The order's country, carried over from checkout — falls back to the
  // shipping/billing address if it's somehow unset. Only orders in one of
  // the merchant's selected countries (CountriesCard in form-setup) should
  // see the form.
  const buyerCountryCode =
    shopify.localization.country.value?.isoCode ??
    shopify.shippingAddress?.value?.countryCode ??
    shopify.billingAddress?.value?.countryCode;
  // The editor previews the form on a sample order, so the per-order gates
  // (country, deadline, existing request) are skipped there — the merchant
  // should see what customers get, not whether that sample order qualifies.
  const isEligibleCountry =
    inEditor ||
    (Boolean(buyerCountryCode) && (settings?.euCountries ?? []).includes(buyerCountryCode));
  const effectiveEligibility = inEditor
    ? { isEligible: true, code: null, message: "", stage: eligibility?.stage ?? "before_delivery" }
    : eligibility;

  // The settings the whole flow renders from, with the delivered copy swapped
  // in once the order has arrived. Everything downstream reads `settings.labels`
  // by its base key names, so no step component needs to know about stages.
  const stagedSettings = useMemo(() => {
    if (!settings) return null;
    return { ...settings, labels: resolveLabels(settings.labels, effectiveEligibility?.stage) };
  }, [settings, effectiveEligibility?.stage]);

  // Whether the compact entry card (the withdrawal "button") is actually on
  // screen — same condition as the render guards below. This is what a
  // "customer viewed the button" event should reflect, not merely that the
  // component mounted.
  const buttonVisible =
    status === "ready" &&
    Boolean(effectiveEligibility?.isEligible) &&
    lines.length > 0 &&
    isEligibleCountry &&
    !started;

  useEffect(() => {
    // Merchant previews in the editor aren't customer funnel activity.
    if (buttonVisible && orderId && !inEditor && !buttonViewedSent.current) {
      buttonViewedSent.current = true;
      recordFormEvent({ orderId, type: "button_viewed", sessionId: sessionId.current });
    }
  }, [buttonVisible, orderId, inEditor]);

  function startForm() {
    if (!inEditor && !formOpenedSent.current) {
      formOpenedSent.current = true;
      recordFormEvent({ orderId, type: "form_opened", sessionId: sessionId.current });
    }
    setStarted(true);
  }

  function toggleLine(lineId, checked) {
    setSelectedLineIds((prev) =>
      checked ? [...prev, lineId] : prev.filter((id) => id !== lineId),
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const selectedLines = lines.filter((line) => selectedLineIds.includes(line.id));
      await submitWithdrawalRequest({
        orderId: order?.id ?? "",
        orderName: order?.name ?? "",
        customerName: fullName,
        customerEmail: email,
        countryCode: buyerCountryCode ?? "",
        // The buyer's language, so their confirmation/decision emails are sent
        // in it (falls back to English on the server when unsupported).
        locale: currentLanguage(),
        // "Other" submits the customer's own text instead of the sentinel.
        reason: reason === OTHER_REASON_VALUE ? otherReason.trim() : reason,
        // Links this submission to the button_viewed / form_opened funnel
        // events recorded before the request existed.
        sessionId: sessionId.current,
        orderLineCount: lines.length,
        shippingAddress: shippingAddress
          ? [
              shippingAddress.address1,
              shippingAddress.address2,
              shippingAddress.city,
              shippingAddress.provinceCode,
              shippingAddress.zip,
              shippingAddress.countryCode,
            ]
              .filter(Boolean)
              .join(", ")
          : "",
        items: selectedLines.map((line) => ({
          lineId: line.id,
          // The join key the backend needs to create a Shopify return.
          // `line.id` is a CartLine id — a different id space from the
          // LineItem ids the Admin API works in, and documented as unstable —
          // so the variant is what actually identifies the item.
          variantId: line.merchandise?.id ?? "",
          title: line.merchandise?.title ?? "Item",
          // The variant title ("xs / red") — shown under the product name in
          // the confirmation emails, so it's persisted alongside the request.
          variantTitle: line.merchandise?.subtitle ?? "",
          sku: line.merchandise?.sku ?? "",
          imageUrl: line.merchandise?.image?.url ?? "",
          quantity: line.quantity,
          price: line.cost?.totalAmount
            ? {
                amount: line.cost.totalAmount.amount,
                currencyCode: line.cost.totalAmount.currencyCode,
              }
            : null,
        })),
      });
      setStep(STEP_DONE);
    } catch (error) {
      console.error("[withdrawal-form] Couldn't submit withdrawal request", error);
      // A rejection the customer can act on (already requested, deadline
      // passed) comes back with its own wording; anything else is a genuine
      // fault and gets the retry message.
      setSubmitError(error.code ? error.message : t("error.submit"));
    } finally {
      setSubmitting(false);
    }
  }

  // In the editor, a form that's switched off (or unreachable) explains
  // itself to the merchant rather than leaving an empty block.
  if (inEditor && status === "hidden") {
    const key = disabledReason === "form_disabled" ? "form_disabled" : "surface_disabled";
    return (
      <s-section>
        <s-banner tone="warning" heading={t(`editor.${key}.heading`)}>
          {t(`editor.${key}.body`)}
        </s-banner>
      </s-section>
    );
  }
  if (inEditor && status === "error") {
    return (
      <s-section>
        <s-banner tone="critical" heading={t("editor.unreachable.heading")}>
          {t("editor.unreachable.body")}
        </s-banner>
      </s-section>
    );
  }

  // While settings/eligibility are still being fetched, whether the form
  // applies at all is unknown — show a skeleton shaped like the compact
  // entry card instead of blank space. Waiting on eligibility also keeps the
  // pre-delivery heading from flashing before the stage is known.
  // lines.length and isEligibleCountry don't depend on either fetch, so
  // they're never part of "loading".
  if (status === "loading" || (status === "ready" && !effectiveEligibility)) {
    return <WithdrawalFormSkeleton />;
  }

  // Past this point the form's applicability is fully determined — disabled,
  // wrong country, no lines — so nothing renders rather than a skeleton that
  // would just vanish again for the majority of customers who won't see the
  // form at all.
  if (status !== "ready" || !effectiveEligibility || lines.length === 0 || !isEligibleCountry) {
    return null;
  }

  // Past the deadline, already requested, order cancelled — the form is gone
  // and the reason takes its place. Submitting is blocked server-side too, so
  // this is the explanation rather than the enforcement.
  if (!effectiveEligibility.isEligible) {
    if (!effectiveEligibility.message) return null;
    return (
      <s-section>
        <s-banner tone="info">{effectiveEligibility.message}</s-banner>
      </s-section>
    );
  }

  // Compact entry card — the flow expands in place when the customer starts.
  if (!started) {
    return (
      <s-section>
        <s-stack direction="block" gap="base">
          <s-heading>{stagedSettings.labels.step1Title}</s-heading>
          <s-paragraph color="subdued">{stagedSettings.labels.step1Description}</s-paragraph>
          <s-stack direction="inline">
            <s-button onClick={startForm}>{t("entry.start")}</s-button>
          </s-stack>
        </s-stack>
      </s-section>
    );
  }

  return (
    <s-section>
      <s-stack direction="block" gap="base">
        <StepProgress stepNumber={STEP_NUMBERS[step]} />

        {step === STEP_DETAILS && (
          <StepDetails
            settings={stagedSettings}
            lines={lines}
            orderName={order?.name ?? ""}
            fullName={fullName}
            email={email}
            selectedLineIds={selectedLineIds}
            onToggleLine={toggleLine}
            reason={reason}
            onReasonChange={setReason}
            otherReason={otherReason}
            onOtherReasonChange={setOtherReason}
            onContinue={() => setStep(STEP_CONFIRM)}
          />
        )}

        {step === STEP_CONFIRM && (
          <StepConfirm
            settings={stagedSettings}
            lines={lines}
            selectedLineIds={selectedLineIds}
            onPrevious={() => setStep(STEP_DETAILS)}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={submitError}
          />
        )}

        {step === STEP_DONE && (
          <StepDone settings={stagedSettings} lines={lines} selectedLineIds={selectedLineIds} />
        )}
      </s-stack>
    </s-section>
  );
}
