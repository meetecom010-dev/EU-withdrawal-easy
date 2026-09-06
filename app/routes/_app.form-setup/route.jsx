import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../../shopify.server";
import { getFormSettings, saveFormSettings } from "../../utils/api/formSettings";
import TurnItOnCard from "./component/TurnItOnCard";
import CountriesCard from "./component/CountriesCard";
import FormFieldsEditor, { tabForErrorPath, localeForErrorPath } from "./component/FormFieldsEditor";
import LivePreview from "./component/LivePreview";
import LanguagesCard from "./component/LanguagesCard";
import AutomationCard from "./component/AutomationCard";
import DeadlineCard from "./component/DeadlineCard";
import FormSetupSkeleton from "./component/FormSetupSkeleton";
import { validateFormSettings } from "./validation";
import { dirtyFingerprint } from "./fieldValue";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

function setPath(obj, path, value) {
  const clone = structuredClone(obj);
  const keys = path.split(".");
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    // Create missing intermediate objects so a sparse path like
    // `translations.de.labels.step1Title` can be written before that locale's
    // translation subtree exists (translations are sparse — a locale only
    // materialises when the merchant first types into one of its fields).
    if (cur[keys[i]] == null || typeof cur[keys[i]] !== "object") cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
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
  // Which language the form builder is currently editing. "en" edits the base
  // copy (labels/reasonField); any other code edits that locale's translation.
  const [activeLocale, setActiveLocale] = useState("en");

  useEffect(() => {
    getFormSettings()

      .then(({ formSettings }) => {
        setSettings(formSettings);
        setSavedSettings(formSettings);
      })
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);

  // Every field updates on each keystroke so the save bar reacts immediately,
  // which makes this run constantly — the baseline only moves on save or
  // discard, so it's normalised on its own rather than per character.
  const savedFingerprint = useMemo(() => dirtyFingerprint(savedSettings), [savedSettings]);
  const currentFingerprint = useMemo(() => dirtyFingerprint(settings), [settings]);
  const hasChanges = Boolean(
    settings && savedSettings && currentFingerprint !== savedFingerprint,
  );

  const errors = useMemo(() => (settings ? validateFormSettings(settings) : {}), [settings]);
  const hasErrors = Object.keys(errors).length > 0;
  // Validation runs live (so Save can react instantly), but the inline field
  // errors only display after a save attempt — editing shouldn't flash red
  // mid-change.
  const [showErrors, setShowErrors] = useState(false);
  // Paths the merchant has gone back to since that save attempt. Their message
  // is hidden while they work on the fix, rather than sitting under the field
  // contradicting what they're typing; the next Save re-runs validation and
  // brings back whatever is still wrong.
  const [dismissedErrors, setDismissedErrors] = useState([]);

  const displayedErrors = useMemo(() => {
    if (!showErrors) return {};
    return Object.fromEntries(
      Object.entries(errors).filter(([path]) => !dismissedErrors.includes(path)),
    );
  }, [errors, showErrors, dismissedErrors]);

  const dismissError = useCallback((path) => {
    setDismissedErrors((prev) => (prev.includes(path) ? prev : [...prev, path]));
  }, []);

  // The dirty flag is the only thing that drives the save bar. Depending on
  // `settings` instead would re-issue show() on every keystroke; this way the
  // App Bridge call happens only when the answer actually flips. `isReady`
  // holds it back until <ui-save-bar> is on the page.
  const isReady = Boolean(settings);
  useEffect(() => {
    if (!shopify || !isReady) return;
    if (hasChanges) {
      shopify.saveBar.show(SAVE_BAR_ID);
    } else {
      shopify.saveBar.hide(SAVE_BAR_ID);
    }
  }, [hasChanges, isReady, shopify]);

  // If the active language tab is removed from the offered list (via the
  // Languages card), fall back to the always-present English tab so the editor
  // never points at a locale that no longer has a tab.
  useEffect(() => {
    const languages = settings?.languages ?? ["en"];
    if (activeLocale !== "en" && !languages.includes(activeLocale)) {
      setActiveLocale("en");
    }
  }, [settings?.languages, activeLocale]);

  function update(path, value) {
    setSettings((prev) => setPath(prev, path, value));
    // Editing a field counts as acting on its message. Controls that can't
    // take an onFocus handler (the choice lists) rely on this alone.
    dismissError(path);
  }

  function handleDiscard() {
    setSettings(savedSettings);
    setShowErrors(false);
    setDismissedErrors([]);
  }

  async function handleSave() {
    if (hasErrors) {
      // The inline field errors (displayedErrors) are the only signal —
      // no error toast. A fresh attempt re-surfaces every message, including
      // ones dismissed by returning to the field.
      setDismissedErrors([]);
      setShowErrors(true);
      // A field can be invalid on a language tab or step tab that isn't open,
      // where its message would be invisible and Save would look like it did
      // nothing. If nothing invalid is on the current view, jump to the first
      // error's language + step so the merchant lands on a message they can see.
      const errorPaths = Object.keys(errors);
      const visibleHere = errorPaths.some(
        (path) => localeForErrorPath(path) === activeLocale && tabForErrorPath(path) === activeTab,
      );
      if (!visibleHere && errorPaths.length > 0) {
        const target = errorPaths[0];
        setActiveLocale(localeForErrorPath(target));
        const targetTab = tabForErrorPath(target);
        if (targetTab) setActiveTab(targetTab);
      }
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const { formSettings } = await saveFormSettings(settings);
      setSettings(formSettings);
      setSavedSettings(formSettings);
      setShowErrors(false);
      setDismissedErrors([]);
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
              <CountriesCard
                settings={settings}
                update={update}
                errors={displayedErrors}
                dismissError={dismissError}
              />
              <FormFieldsEditor
                settings={settings}
                update={update}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                activeLocale={activeLocale}
                onLocaleChange={setActiveLocale}
                errors={displayedErrors}
                dismissError={dismissError}
              />
              <LanguagesCard settings={settings} update={update} />
              <AutomationCard
                settings={settings}
                update={update}
                errors={displayedErrors}
                dismissError={dismissError}
              />
              <DeadlineCard
                settings={settings}
                update={update}
                errors={displayedErrors}
                dismissError={dismissError}
              />
            </s-stack>
            <div style={{ position: "sticky", top: "16px", alignSelf: "start" }}>
              <LivePreview settings={settings} activeTab={activeTab} activeLocale={activeLocale} />
            </div>
          </s-grid>
        </s-query-container>
      </s-stack>
    </s-page>
  );
}
