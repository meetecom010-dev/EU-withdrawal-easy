/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { SUBJECT_MAX, TEMPLATE_LIST, TEMPLATE_META } from "../constants";
import BodyEditor from "./BodyEditor";

// The notification configuration: which email is being edited, whether it's on,
// its subject, and its HTML/Liquid body. A compact select switches templates so
// the page stays single-column and familiar, like Shopify's notification list.
// The select is driven by the registry, so new templates appear automatically.
export default function NotificationEditor({
  templates,
  selectedKey,
  onSelect,
  update,
  dismissError,
  errors,
  onReset,
}) {
  const meta = TEMPLATE_META[selectedKey];
  const template = templates[selectedKey];

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
          value={template.subject}
          maxLength={SUBJECT_MAX}
          error={errors[`templates.${selectedKey}.subject`]}
          onInput={(e) => update(`templates.${selectedKey}.subject`, e.currentTarget.value)}
          onFocus={() => dismissError(`templates.${selectedKey}.subject`)}
        ></s-text-field>

        <BodyEditor
          key={selectedKey}
          value={template.bodyHtml}
          error={errors[`templates.${selectedKey}.bodyHtml`]}
          onChange={(value) => update(`templates.${selectedKey}.bodyHtml`, value)}
          onFocus={() => dismissError(`templates.${selectedKey}.bodyHtml`)}
        />

        <s-stack direction="inline" gap="base" alignItems="center">
          <s-button
            variant="tertiary"
            tone="critical"
            disabled={!template.customized || undefined}
            onClick={onReset}
          >
            Reset to default
          </s-button>
          {template.customized && <s-badge tone="info">Customized</s-badge>}
        </s-stack>
      </s-stack>
    </s-section>
  );
}
