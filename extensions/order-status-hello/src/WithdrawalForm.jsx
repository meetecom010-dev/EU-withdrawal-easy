import { useEffect, useState } from "preact/hooks";
import { fetchFormSettings, submitWithdrawalRequest } from "./lib/api.js";
import StepProgress from "./components/StepProgress.jsx";
import StepDetails from "./components/StepDetails.jsx";
import StepConfirm from "./components/StepConfirm.jsx";
import StepDone from "./components/StepDone.jsx";

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
  const [status, setStatus] = useState("loading"); // loading | ready | hidden
  const [settings, setSettings] = useState(null);
  const [step, setStep] = useState(STEP_DETAILS);
  const [selectedLineIds, setSelectedLineIds] = useState([]);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    let cancelled = false;

    fetchFormSettings()
      .then((data) => {
        if (cancelled) return;
        if (data.enabled) {
          setSettings(data);
          setStatus("ready");
        } else {
          setStatus("hidden");
        }
      })
      .catch((error) => {
        // Fail closed: a customer's order-status page shouldn't show a raw
        // error for a feature they may not even know exists. Developers can
        // still see what went wrong in the console.
        console.error("[withdrawal-form] Couldn't load form settings", error);
        if (!cancelled) setStatus("hidden");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const lines = shopify.lines.value ?? [];
  const order = shopify.order.value;
  const fullName = shopify.buyerIdentity?.customer?.value?.fullName ?? "";
  const email = shopify.buyerIdentity?.email?.value ?? "";
  // The order's country, carried over from checkout — falls back to the
  // shipping/billing address if it's somehow unset. Only orders in one of
  // the merchant's selected countries (CountriesCard in form-setup) should
  // see the form.
  const buyerCountryCode =
    shopify.localization.country.value?.isoCode ??
    shopify.shippingAddress?.value?.countryCode ??
    shopify.billingAddress?.value?.countryCode;
  const isEligibleCountry =
    Boolean(buyerCountryCode) && (settings?.euCountries ?? []).includes(buyerCountryCode);

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
      const shippingAddress = shopify.shippingAddress?.value;
      await submitWithdrawalRequest({
        orderId: order?.id ?? "",
        orderName: order?.name ?? "",
        customerName: fullName,
        customerEmail: email,
        countryCode: buyerCountryCode ?? "",
        reason,
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
          title: line.merchandise?.title ?? "Item",
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
      setSubmitError("Something went wrong submitting your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <s-section>
        <s-stack direction="inline" gap="small-200" alignItems="center">
          <s-spinner accessibilityLabel="Loading withdrawal form"></s-spinner>
          <s-text color="subdued">Loading...</s-text>
        </s-stack>
      </s-section>
    );
  }

  if (status !== "ready" || lines.length === 0 || !isEligibleCountry) {
    return null;
  }

  return (
    <s-section>
      <s-stack direction="block" gap="base">
        <StepProgress stepNumber={STEP_NUMBERS[step]} />

        {step === STEP_DETAILS && (
          <StepDetails
            settings={settings}
            lines={lines}
            orderName={order?.name ?? ""}
            fullName={fullName}
            email={email}
            selectedLineIds={selectedLineIds}
            onToggleLine={toggleLine}
            reason={reason}
            onReasonChange={setReason}
            onContinue={() => setStep(STEP_CONFIRM)}
          />
        )}

        {step === STEP_CONFIRM && (
          <StepConfirm
            settings={settings}
            lines={lines}
            selectedLineIds={selectedLineIds}
            onPrevious={() => setStep(STEP_DETAILS)}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={submitError}
          />
        )}

        {step === STEP_DONE && (
          <StepDone settings={settings} lines={lines} selectedLineIds={selectedLineIds} />
        )}
      </s-stack>
    </s-section>
  );
}
