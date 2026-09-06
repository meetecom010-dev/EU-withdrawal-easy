/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { SUBJECT_MAX, TEMPLATE_LIST, TEMPLATE_META } from "../constants";
import { AVAILABLE_LANGUAGES } from "../../_app.form-setup/constants";
import BodyEditor from "./BodyEditor";

const BASE_LOCALE = "en";

function languageName(code) {
  return AVAILABLE_LANGUAGES.find((lang) => lang.code === code)?.name ?? code.toUpperCase();
}

// The notification configuration: which email is being edited, whether it's on,
// its subject, and its HTML/Liquid body. A compact select switches templates so
// the page stays single-column and familiar, like Shopify's notification list.
// Customer emails add a language tab bar — each language is prefilled with a
// default translation the merchant can edit; the buyer receives their language
// automatically (the merchant notification is single-language).
export default function NotificationEditor({
  templates,
  languages,
  selectedKey,
  onSelect,
  activeLocale = BASE_LOCALE,
  onLocaleChange,
  update,
  dismissError,
  errors,
  onReset,
}) {
  const meta = TEMPLATE_META[selectedKey];
  const template = templates[selectedKey];

  // Language tabs offered for this email: English first, then every offered
  // language that actually has a translation for this template (customer emails
  // only — the merchant notification has none, so it stays English-only).
  const localeTabs = [
    BASE_LOCALE,
    ...(languages ?? []).filter(
      (code) => code !== BASE_LOCALE && template.translations?.[code],
    ),
  ];
  const locale = localeTabs.includes(activeLocale) ? activeLocale : BASE_LOCALE;
  const isBase = locale === BASE_LOCALE;

  // The copy + write-path for the active language: the template top level for
  // English, or its translation subtree otherwise.
  const copy = isBase ? template : template.translations[locale];
  const at = (field) =>
    isBase
      ? `templates.${selectedKey}.${field}`
      : `templates.${selectedKey}.translations.${locale}.${field}`;

  return (
    <s-section heading="Notification">
      <s-stack direction="block" gap="base">
        <s-select
          label="Email"
          value={selectedKey}
          onChange={(e) => onSelect(e.currentTarget.value)}
        >
          {TEMPLATE_LIST.map((m) => (
            <s-option key={m.key} value={m.key}>
              {m.name}
            </s-option>
          ))}
        </s-select>

        <s-paragraph color="subdued">{meta.description}</s-paragraph>

        {localeTabs.length > 1 && (
          <s-stack direction="block" gap="small-200">
            <s-stack direction="inline" gap="small-200" alignItems="center">
              <s-text type="strong">Language</s-text>
              <s-badge tone={isBase ? "info" : "caution"}>
                {isBase ? "Base language" : "Translation"}
              </s-badge>
            </s-stack>
            <s-stack direction="inline" gap="small-200">
              {localeTabs.map((code) => (
                <s-button
                  key={code}
                  variant={locale === code ? "primary" : "secondary"}
                  onClick={() => onLocaleChange(code)}
                >
                  {languageName(code)}
                </s-button>
              ))}
            </s-stack>
          </s-stack>
        )}

        {!isBase && (
          <s-banner tone="info">
            Editing the {languageName(locale)} version. It&apos;s prefilled with a default
            translation — the buyer receives this language automatically, falling back to English.
          </s-banner>
        )}

        {/* The enable toggle is shop-wide (not per language), so it always writes
            the template's base `enabled`. */}
        <s-checkbox
          label="Send this email"
          checked={meta.required || template.enabled}
          disabled={meta.required || undefined}
          details={
            meta.required
              ? "Always on — this confirmation is required by EU law and can't be turned off."
              : "Turn off to stop sending this notification."
          }
          onChange={(e) => update(`templates.${selectedKey}.enabled`, e.currentTarget.checked)}
        ></s-checkbox>

        <s-text-field
          label="Subject"
          value={copy.subject}
          maxLength={SUBJECT_MAX}
          error={errors[at("subject")]}
          onInput={(e) => update(at("subject"), e.currentTarget.value)}
          onFocus={() => dismissError(at("subject"))}
        ></s-text-field>

        <BodyEditor
          key={`${selectedKey}-${locale}`}
          value={copy.bodyHtml}
          locale={locale}
          error={errors[at("bodyHtml")]}
          onChange={(value) => update(at("bodyHtml"), value)}
          onFocus={() => dismissError(at("bodyHtml"))}
        />

        <s-stack direction="inline" gap="base" alignItems="center">
          <s-button
            variant="tertiary"
            tone="critical"
            disabled={!copy.customized || undefined}
            onClick={onReset}
          >
            Reset to default
          </s-button>
          {copy.customized && <s-badge tone="info">Customized</s-badge>}
        </s-stack>
      </s-stack>
    </s-section>
  );
}
