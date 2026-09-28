/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import OrderStatusExtensionStatus from "../../../../components/OrderStatusExtensionStatus";
import StandalonePageStatus from "../../../../components/StandalonePageStatus";

function StepIcon({ complete }) {
  return complete ? (
    <s-icon type="check-circle" tone="success"></s-icon>
  ) : (
    <s-icon type="circle-dashed" tone="neutral"></s-icon>
  );
}

export default function SetupGuideCard({
  setupSteps,
  completedCount,
  onDismissed,
}) {
  const { t } = useTranslation();
  const [guideExpanded, setGuideExpanded] = useState(true);
  // Auto-expand the first incomplete step once on mount — after that, the
  // merchant's own expand/collapse choice takes over, even as steps
  // complete live underneath them (e.g. via OrderStatusExtensionSync).
  const [expandedStepKey, setExpandedStepKey] = useState(
    () => setupSteps.find((step) => !step.complete)?.key ?? null,
  );

  return (
    <s-section>
      <s-grid gap="base">
        <s-grid gap="small-200">
          <s-stack direction="block" gap="small-500">
            <s-grid
              gridTemplateColumns="1fr auto auto"
              gap="small-300"
              alignItems="center"
            >
              <s-heading>{t("home.setupGuide.heading")}</s-heading>
              <s-button
                accessibilityLabel={t("home.setupGuide.dismiss")}
                variant="tertiary"
                tone="neutral"
                icon="x"
                onClick={onDismissed}
              ></s-button>
              <s-button
                accessibilityLabel={
                  guideExpanded ? t("home.setupGuide.collapse") : t("home.setupGuide.expand")
                }
                variant="tertiary"
                tone="neutral"
                icon={guideExpanded ? "chevron-up" : "chevron-down"}
                onClick={() => setGuideExpanded((current) => !current)}
              ></s-button>
            </s-grid>
            <s-paragraph color="subdued">{t("home.setupGuide.description")}</s-paragraph>
          </s-stack>
          <s-text color="subdued">
            {t("home.setupGuide.progress", {
              completed: completedCount,
              total: setupSteps.length,
            })}
          </s-text>
        </s-grid>

        {guideExpanded && (
          <s-box border="base" borderRadius="base">
            {setupSteps.map((step, index) => {
              // Completed steps stay reviewable — only the default (first
              // incomplete step, see above) changes based on completion.
              const isStepExpanded = expandedStepKey === step.key;

              return (
                <s-box key={step.key}>
                  {index > 0 && <s-divider></s-divider>}
                  <s-grid
                    gridTemplateColumns="auto 1fr auto"
                    gap="small-300"
                    alignItems="center"
                    padding="small"
                  >
                    <StepIcon complete={step.complete} />
                    <s-text color={step.complete ? "subdued" : undefined}>
                      {step.label}
                    </s-text>
                    <s-button
                      accessibilityLabel={
                        isStepExpanded
                          ? t("home.setupGuide.hideStep", { step: step.label })
                          : t("home.setupGuide.showStep", { step: step.label })
                      }
                      variant="tertiary"
                      tone="neutral"
                      icon={isStepExpanded ? "chevron-up" : "chevron-down"}
                      onClick={() =>
                        setExpandedStepKey((current) =>
                          current === step.key ? null : step.key,
                        )
                      }
                    ></s-button>
                  </s-grid>

                  {isStepExpanded && (
                    <s-box padding="small" paddingBlockStart="none">
                      <s-stack direction="block" gap="small-200">
                        {step.key === "blocks" ? step.locked ? (
                          <s-box padding="base" background="subdued" borderRadius="base">
                            <s-paragraph color="subdued">
                              {t("home.setupGuide.steps.blocks.locked", {
                                step: setupSteps.findIndex((s) => s.key === "form") + 1,
                              })}
                            </s-paragraph>
                          </s-box>
                        ) : (
                          <s-stack direction="block" gap="base">
                            <s-paragraph color="subdued">{step.description}</s-paragraph>
                            {step.surfaces.map((surface) => (
                              <s-box
                                key={surface.key}
                                padding="base"
                                borderWidth="base"
                                borderRadius="base"
                              >
                                <s-stack direction="block" gap="small-200">
                                  {/* Status indicator, not a control — checked
                                      state is synced live from
                                      *ExtensionSync, not user-togglable. */}
                                  <s-checkbox
                                    label={surface.label}
                                    checked={surface.added}
                                    disabled
                                  ></s-checkbox>
                                  {surface.added ? (
                                    <s-banner tone="success">{surface.liveMessage}</s-banner>
                                  ) : surface.key === "orderStatus" ? (
                                    <OrderStatusExtensionStatus />
                                  ) : (
                                    <StandalonePageStatus />
                                  )}
                                </s-stack>
                              </s-box>
                            ))}
                          </s-stack>
                        ) : (
                          <s-box
                            padding="base"
                            background="subdued"
                            borderRadius="base"
                          >
                            <s-stack direction="block" gap="small-200">
                              <s-paragraph color="subdued">
                                {step.description}
                              </s-paragraph>
                              {step.onToggle &&
                                (step.useSwitch ? (
                                  <s-switch
                                    label={step.checkboxLabel ?? step.label}
                                    checked={step.complete}
                                    onChange={(event) =>
                                      step.onToggle(event.currentTarget.checked)
                                    }
                                  ></s-switch>
                                ) : (
                                  <s-checkbox
                                    label={step.checkboxLabel ?? step.label}
                                    checked={step.complete}
                                    onChange={(event) =>
                                      step.onToggle(event.currentTarget.checked)
                                    }
                                  ></s-checkbox>
                                ))}
                              {step.placementOptions && step.complete && (
                                <s-box padding="base" borderWidth="base" borderRadius="base">
                                  <s-stack direction="block" gap="small-200">
                                    <s-heading>{step.placementHeading}</s-heading>
                                    <s-paragraph color="subdued">
                                      {step.placementDescription}
                                    </s-paragraph>
                                    {step.placementOptions.map((option) => (
                                      <s-checkbox
                                        key={option.key}
                                        label={option.label}
                                        details={option.details}
                                        checked={option.checked}
                                        onChange={(event) =>
                                          option.onToggle(event.currentTarget.checked)
                                        }
                                      ></s-checkbox>
                                    ))}
                                  </s-stack>
                                </s-box>
                              )}
                              {step.ctaHref && (
                                <s-stack direction="inline">
                                  <s-button
                                    variant="primary"
                                    href={step.ctaHref}
                                  >
                                    {step.ctaLabel}
                                  </s-button>
                                </s-stack>
                              )}
                            </s-stack>
                          </s-box>
                        )}
                      </s-stack>
                    </s-box>
                  )}
                </s-box>
              );
            })}
          </s-box>
        )}
      </s-grid>
    </s-section>
  );
}
