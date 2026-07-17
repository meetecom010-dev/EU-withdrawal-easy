import { useEffect, useMemo, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../../shopify.server";
import { getFormSettings, saveFormSettings } from "../../utils/api/formSettings";
import TurnItOnCard from "./component/TurnItOnCard";
import CountriesCard from "./component/CountriesCard";
import FormFieldsEditor from "./component/FormFieldsEditor";
import LivePreview from "./component/LivePreview";
import LanguagesCard from "./component/LanguagesCard";
import AutomationCard from "./component/AutomationCard";
import FormSetupSkeleton from "./component/FormSetupSkeleton";
import { validateFormSettings } from "./validation";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

function setPath(obj, path, value) {
  const clone = structuredClone(obj);
  const keys = path.split(".");
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
  cur[keys[keys.length - 1]] = value;
  return clone;
}

const SAVE_BAR_ID = "form-setup-save-bar";

export default function FormSetup() {
  const shopify = useAppBridge();
  const [settings, setSettings] = useState(null);
  // The last-saved (or last-loaded) state — the Discard button reverts to
  // this, and it's what "has this form actually been modified" is measured
  // against. Only handleSave is allowed to move it forward.
  const [savedSettings, setSavedSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("step1");

  useEffect(() => {
    getFormSettings()

      .then(({ formSettings }) => {
        setSettings(formSettings);
        setSavedSettings(formSettings);
      })
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = Boolean(
    settings && savedSettings && JSON.stringify(settings) !== JSON.stringify(savedSettings),
  );

  const errors = useMemo(() => (settings ? validateFormSettings(settings) : {}), [settings]);
  const hasErrors = Object.keys(errors).length > 0;

  useEffect(() => {
    if (!shopify || !settings) return;
    if (hasChanges) {
      shopify.saveBar.show(SAVE_BAR_ID);
    } else {
      shopify.saveBar.hide(SAVE_BAR_ID);
    }
  }, [hasChanges, shopify, settings]);

  function update(path, value) {
    setSettings((prev) => setPath(prev, path, value));
  }

  function handleDiscard() {
    setSettings(savedSettings);
  }

  async function handleSave() {
    if (hasErrors) {
      shopify.toast.show("Fix the highlighted fields before saving", { isError: true });
      return;
    }
    setIsSaving(true);
    try {
      const { formSettings } = await saveFormSettings(settings);
      setSettings(formSettings);
      setSavedSettings(formSettings);
      shopify.toast.show("Form settings saved");
    } catch (error) {
      shopify.toast.show(error.message, { isError: true });
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return <FormSetupSkeleton />;
  }

  if (loadError) {
    return (
      <s-page heading="Form setup">
        <s-banner tone="critical" heading="Couldn't load form settings">
          <s-paragraph>{loadError}</s-paragraph>
        </s-banner>
      </s-page>
    );
  }

  return (
    <s-page heading="Form setup">
      <s-button slot="breadcrumb-actions" href="/" accessibilityLabel="Back to dashboard" />

      {/* Shopify's native contextual save bar — shows automatically only
          while `settings` differs from `savedSettings`. Discard reverts the
          in-memory state; nothing is written to the DB on discard. */}
      <ui-save-bar id={SAVE_BAR_ID}>
        <button variant="primary" onClick={handleSave} disabled={isSaving || hasErrors || undefined}>
          Save
        </button>
        <button onClick={handleDiscard} disabled={isSaving || undefined}>
          Discard
        </button>
      </ui-save-bar>
      <s-stack gap="large-100">

        {/* Left column: every setting, stacked. Right column: the live
            preview, sticky for the whole page so it stays visible while
            editing anything on the left — not just the form builder. */}
        <s-grid gridTemplateColumns="2fr 1fr" gap="base">
          <s-stack direction="block" gap="large-100">
            <TurnItOnCard settings={settings} update={update} />
            <CountriesCard settings={settings} update={update} errors={errors} />
            <FormFieldsEditor
              settings={settings}
              update={update}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              errors={errors}
            />
            <LanguagesCard settings={settings} update={update} />
            <AutomationCard settings={settings} update={update} errors={errors} />
          </s-stack>
          <div style={{ position: "sticky", top: "16px", alignSelf: "start" }}>
            <LivePreview settings={settings} activeTab={activeTab} />
          </div>
        </s-grid>
      </s-stack>
    </s-page>
  );
}
