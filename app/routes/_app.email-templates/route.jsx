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
  for (let i = 0; i < keys.length - 1; i++) {
    // Create missing intermediates so a per-locale path like
    // `templates.customerConfirmation.translations.de.subject` is writable even
    // before that language's override subtree exists.
    if (cur[keys[i]] == null || typeof cur[keys[i]] !== "object") cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return clone;
}

const BASE_EMAIL_LOCALE = "en";

// Splits an error path into the template + language it belongs to, so Save can
// jump to the exact tab. "templates.customerConfirmation.translations.de.subject"
// -> { templateKey: "customerConfirmation", locale: "de" }.
function locationForErrorPath(path) {
  if (!path?.startsWith("templates.")) return null;
  const parts = path.split(".");
  return {
    templateKey: parts[1],
    locale: parts[2] === "translations" ? parts[3] : BASE_EMAIL_LOCALE,
  };
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
  // Which language of the selected email is being edited. "en" edits the base
  // copy; any other code edits that language's translation.
  const [activeLocale, setActiveLocale] = useState(BASE_EMAIL_LOCALE);

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

  // Reset drops the current language back to the registry default. Saving then
  // produces an empty override for that language, so the customisation is
  // removed entirely — other languages are left untouched.
  const resetToDefault = useCallback(() => {
    setSettings((prev) => {
      const template = prev.templates[selectedKey];
      if (activeLocale === BASE_EMAIL_LOCALE) {
        return {
          ...prev,
          templates: {
            ...prev.templates,
            [selectedKey]: {
              ...template,
              ...templateDefault(selectedKey, BASE_EMAIL_LOCALE),
              customized: false,
            },
          },
        };
      }
      return {
        ...prev,
        templates: {
          ...prev.templates,
          [selectedKey]: {
            ...template,
            translations: {
              ...template.translations,
              [activeLocale]: { ...templateDefault(selectedKey, activeLocale), customized: false },
            },
          },
        },
      };
    });
    shopify?.toast?.show(`${TEMPLATE_META[selectedKey].name} reset to default`);
  }, [selectedKey, activeLocale, shopify]);

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
    // Start each email on its base language; not every template offers the same
    // set of translation tabs (the merchant notification has none).
    setActiveLocale(BASE_EMAIL_LOCALE);
  }

  async function handleSave() {
    if (hasErrors) {
      setDismissedErrors([]);
      setShowErrors(true);
      // Jump to the template + language that owns the first error so its
      // message is visible. Sender errors (sender.*) stay put — those fields are
      // always shown at the top.
      const location = locationForErrorPath(Object.keys(errors)[0]);
      if (location) {
        if (location.templateKey !== selectedKey) setSelectedKey(location.templateKey);
        setActiveLocale(location.locale);
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
          languages={settings.languages}
          selectedKey={selectedKey}
          onSelect={handleSelect}
          activeLocale={activeLocale}
          onLocaleChange={setActiveLocale}
          update={update}
          dismissError={dismissError}
          errors={displayedErrors}
          onReset={resetToDefault}
        />
      </s-stack>
    </s-page>
  );
}
