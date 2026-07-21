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
import DeadlineCard from "./component/DeadlineCard";
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
  // Save failures surface in a critical banner, not a toast — Built for
  // Shopify guidelines reserve toasts for confirmations.
  const [saveError, setSaveError] = useState(null);
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
  // Validation runs live (so Save can react instantly), but the inline field
  // errors only display after a save attempt — editing shouldn't flash red
  // mid-change.
  const [showErrors, setShowErrors] = useState(false);
  const displayedErrors = showErrors ? errors : {};

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
    setShowErrors(false);
  }

  async function handleSave() {
    if (hasErrors) {
      // The inline field errors (displayedErrors) are the only signal —
      // no error toast.
      setShowErrors(true);
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const { formSettings } = await saveFormSettings(settings);
      setSettings(formSettings);
      setSavedSettings(formSettings);
      setShowErrors(false);
      shopify.toast.show("Form settings saved");
    } catch (error) {
      setSaveError(error.message);
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
        {/* Save stays clickable even with invalid fields — clicking it is
            what reveals the inline errors (displayedErrors above). */}
        <button variant="primary" onClick={handleSave} disabled={isSaving || undefined}>
          Save
        </button>
        <button onClick={handleDiscard} disabled={isSaving || undefined}>
          Discard
        </button>
      </ui-save-bar>
      <s-stack gap="base">
        {saveError && (
          <s-banner
            tone="critical"
            heading="Couldn't save form settings"
            dismissible
            onDismiss={() => setSaveError(null)}
          >
            <s-paragraph>{saveError}</s-paragraph>
          </s-banner>
        )}

        {/* Left column: every setting, stacked. Right column: the live
            preview, sticky for the whole page so it stays visible while
            editing anything on the left. The query container collapses the
            grid to a single column when the page gets narrow. */}
        <s-query-container>
          <s-grid
            gridTemplateColumns="@container (inline-size > 700px) 2fr 1fr, 1fr"
            gap="base"
            alignItems="start"
          >
            <s-stack direction="block" gap="base">
              <TurnItOnCard settings={settings} update={update} />
              <CountriesCard settings={settings} update={update} errors={displayedErrors} />
              <FormFieldsEditor
                settings={settings}
                update={update}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                errors={displayedErrors}
              />
              <LanguagesCard settings={settings} update={update} />
              <AutomationCard settings={settings} update={update} errors={displayedErrors} />
              <DeadlineCard settings={settings} update={update} errors={displayedErrors} />
            </s-stack>
            <div style={{ position: "sticky", top: "16px", alignSelf: "start" }}>
              <LivePreview settings={settings} activeTab={activeTab} />
            </div>
          </s-grid>
        </s-query-container>
      </s-stack>
    </s-page>
  );
}
