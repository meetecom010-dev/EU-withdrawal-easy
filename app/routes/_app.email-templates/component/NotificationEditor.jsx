/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useTranslation } from "react-i18next";
import { SUBJECT_MAX, TEMPLATE_LIST, TEMPLATE_META } from "../constants";
import { useFormatters } from "../../../i18n/react";
import BodyEditor from "./BodyEditor";

const BASE_LOCALE = "en";

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
  const { t } = useTranslation();
  const { languageName } = useFormatters();
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
    <s-section heading={t("emailTemplates.notification.heading")}>
      <s-stack direction="block" gap="base">
        <s-select
          label={t("emailTemplates.notification.emailLabel")}
          value={selectedKey}
          onChange={(e) => onSelect(e.currentTarget.value)}
        >
          {TEMPLATE_LIST.map((m) => (
            <s-option key={m.key} value={m.key}>
              {t(`emailTemplates.templates.${m.key}.name`)}
            </s-option>
          ))}
        </s-select>

        <s-paragraph color="subdued">
          {t(`emailTemplates.templates.${meta.key}.description`)}
        </s-paragraph>

        {localeTabs.length > 1 && (
          <s-select
            label={t("emailTemplates.notification.language")}
            details={t("emailTemplates.notification.languageDetails")}
            value={locale}
            onChange={(e) => onLocaleChange(e.currentTarget.value)}
          >
            {localeTabs.map((code) => (
              <s-option key={code} value={code}>
                {languageName(code)}
              </s-option>
            ))}
          </s-select>
        )}

        {/* The enable toggle is shop-wide (not per language), so it always writes
            the template's base `enabled`. */}
        <s-checkbox
          label={t("emailTemplates.notification.send")}
          checked={meta.required || template.enabled}
          disabled={meta.required || undefined}
          details={
            meta.required
              ? t("emailTemplates.notification.requiredDetails")
              : selectedKey === "merchantNotification"
                ? t("emailTemplates.notification.merchantDetails")
                : t("emailTemplates.notification.decisionDetails")
          }
          onChange={(e) => update(`templates.${selectedKey}.enabled`, e.currentTarget.checked)}
        ></s-checkbox>

        <s-text-field
          label={t("emailTemplates.notification.subject")}
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
            {t("emailTemplates.notification.reset")}
          </s-button>
          {copy.customized && <s-badge tone="info">{t("emailTemplates.notification.customized")}</s-badge>}
        </s-stack>
      </s-stack>
    </s-section>
  );
}
