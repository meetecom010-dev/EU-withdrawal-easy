import { useEffect, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../../shopify.server";
import { apiFetch } from "../../utils/api/client";
import FormFieldsEditor from "./component/FormFieldsEditor";
import LivePreview from "./component/LivePreview";
import PickerChips from "./component/PickerChips";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

const REASON_OPTIONS = [
  "Changed my mind",
  "Wrong size",
  "Item defective",
  "Arrived late",
  "Other",
];

export default function FormSetup() {
  const shopify = useAppBridge();
  const [fields, setFields] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/form-settings").then(({ formSettings }) => {
      setFields(formSettings.fields);
      setReasons(formSettings.reasons);
      setLoading(false);
    });
  }, []);

  function toggleReason(reason) {
    setReasons((current) =>
      current.includes(reason)
        ? current.filter((r) => r !== reason)
        : [...current, reason],
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch("/form-settings", {
        method: "PUT",
        body: { fields, reasons },
      });
      shopify.toast.show("Form settings saved");
    } catch (error) {
      shopify.toast.show(error.message, { isError: true });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <s-page heading="Form setup">
        <s-paragraph>Loading...</s-paragraph>
      </s-page>
    );
  }

  return (
    <s-page heading="Form setup">
      <s-button
        slot="primary-action"
        onClick={handleSave}
        {...(saving ? { loading: true } : {})}
      >
        Save
      </s-button>
      <s-grid gridTemplateColumns="1fr 1fr" gap="base">
        <s-section heading="Fields">
          <FormFieldsEditor fields={fields} onChange={setFields} />
          <s-text color="subdued">Withdrawal reasons</s-text>
          <PickerChips options={REASON_OPTIONS} selected={reasons} onToggle={toggleReason} />
        </s-section>
        <LivePreview fields={fields} reasons={reasons} />
      </s-grid>
    </s-page>
  );
}
