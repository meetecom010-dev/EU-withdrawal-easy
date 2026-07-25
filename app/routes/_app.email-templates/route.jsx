import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../../shopify.server";
import { getEmailSettings, saveEmailSettings } from "../../utils/api/emailSettings";
import { templateDefault } from "../../services/email/registry";
import { TEMPLATE_META, TEMPLATE_LIST } from "./constants";
import { validateEmailSettings } from "./validation";
import SenderSettings from "./component/SenderSettings";
import NotificationEditor from "./component/NotificationEditor";
import EmailTemplatesSkeleton from "./component/EmailTemplatesSkeleton";

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

const SAVE_BAR_ID = "email-templates-save-bar";
const DEFAULT_KEY = TEMPLATE_LIST[0].key;

export default function EmailTemplates() {
  const shopify = useAppBridge();
  const [settings, setSettings] = useState(null);
  const [savedSettings, setSavedSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [selectedKey, setSelectedKey] = useState(DEFAULT_KEY);

  const [showErrors, setShowErrors] = useState(false);
  const [dismissedErrors, setDismissedErrors] = useState([]);

  useEffect(() => {
    getEmailSettings()
      .then(({ emailSettings }) => {
        setSettings(emailSettings);
        setSavedSettings(emailSettings);
      })
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = useMemo(
    () =>
      Boolean(settings && savedSettings && JSON.stringify(settings) !== JSON.stringify(savedSettings)),
    [settings, savedSettings],
  );

  const errors = useMemo(() => (settings ? validateEmailSettings(settings) : {}), [settings]);
  const hasErrors = Object.keys(errors).length > 0;

  const displayedErrors = useMemo(() => {
    if (!showErrors) return {};
    return Object.fromEntries(
      Object.entries(errors).filter(([path]) => !dismissedErrors.includes(path)),
    );
  }, [errors, showErrors, dismissedErrors]);

  const dismissError = useCallback((path) => {
    setDismissedErrors((prev) => (prev.includes(path) ? prev : [...prev, path]));
  }, []);

  const isReady = Boolean(settings);
  useEffect(() => {
    if (!shopify || !isReady) return;
    if (hasChanges) {
      shopify.saveBar.show(SAVE_BAR_ID);
    } else {
      shopify.saveBar.hide(SAVE_BAR_ID);
    }
  }, [hasChanges, isReady, shopify]);

  const update = useCallback(
    (path, value) => {
      setSettings((prev) => setPath(prev, path, value));
      dismissError(path);
    },
    [dismissError],
  );

  // Reset drops back to the registry default. Saving then produces an empty
  // override, so the shop's customisation is removed entirely.
  const resetToDefault = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      templates: { ...prev.templates, [selectedKey]: { ...templateDefault(selectedKey), customized: false } },
    }));
    shopify?.toast?.show(`${TEMPLATE_META[selectedKey].name} reset to default`);
  }, [selectedKey, shopify]);

  function handleDiscard() {
    setSettings(savedSettings);
    setShowErrors(false);
    setDismissedErrors([]);
  }

  // Switching templates with unsaved edits would silently lose them, so ask the
  // merchant to finish first: the save bar's own leave confirmation gates the
  // switch. It resolves when they choose to leave (then we discard and switch)
  // and rejects when they cancel (stay put).
  async function handleSelect(key) {
    if (key === selectedKey) return;
    if (hasChanges) {
      try {
        await shopify.saveBar.leaveConfirmation();
      } catch {
        return;
      }
      handleDiscard();
    }
    setSelectedKey(key);
  }

  async function handleSave() {
    if (hasErrors) {
      setDismissedErrors([]);
      setShowErrors(true);
      // Jump to the template that owns the first error so its message is
      // visible. Sender errors (sender.*) stay put — those fields are always
      // shown at the top.
      const firstErrorKey = Object.keys(errors)[0];
      const templateKey = firstErrorKey?.startsWith("templates.") ? firstErrorKey.split(".")[1] : null;
      if (templateKey && templateKey !== selectedKey) {
        setSelectedKey(templateKey);
      }
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const { emailSettings } = await saveEmailSettings(settings);
      setSettings(emailSettings);
      setSavedSettings(emailSettings);
      setShowErrors(false);
      setDismissedErrors([]);
      shopify.toast.show("Email templates saved");
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return <EmailTemplatesSkeleton />;
  }

  if (loadError) {
    return (
      <s-page heading="Email templates">
        <s-banner tone="critical" heading="Couldn't load email templates">
          <s-paragraph>{loadError}</s-paragraph>
        </s-banner>
      </s-page>
    );
  }

  return (
    <s-page heading="Email templates">
      <s-button slot="breadcrumb-actions" href="/" accessibilityLabel="Back to dashboard" />

      <ui-save-bar id={SAVE_BAR_ID}>
        <button variant="primary" onClick={handleSave} disabled={isSaving || undefined}>
          Save
        </button>
        <button onClick={handleDiscard} disabled={isSaving || undefined}>
          Discard
        </button>
      </ui-save-bar>

      <s-stack direction="block" gap="base">
        {saveError && (
          <s-banner
            tone="critical"
            heading="Couldn't save email templates"
            dismissible
            onDismiss={() => setSaveError(null)}
          >
            <s-paragraph>{saveError}</s-paragraph>
          </s-banner>
        )}

        <SenderSettings
          sender={settings.sender}
          defaultFromEmail={settings.defaultFromEmail}
          update={update}
          dismissError={dismissError}
          errors={displayedErrors}
        />

        <NotificationEditor
          templates={settings.templates}
          selectedKey={selectedKey}
          onSelect={handleSelect}
          update={update}
          dismissError={dismissError}
          errors={displayedErrors}
          onReset={resetToDefault}
        />
      </s-stack>
    </s-page>
  );
}
