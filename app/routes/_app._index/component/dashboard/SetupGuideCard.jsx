/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";
import OrderStatusExtensionStatus from "../../../../components/OrderStatusExtensionStatus";

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
          <s-grid
            gridTemplateColumns="1fr auto auto"
            gap="small-300"
            alignItems="center"
          >
            <s-heading>Set up guide</s-heading>
            <s-button
              accessibilityLabel="Dismiss guide"
              variant="tertiary"
              tone="neutral"
              icon="x"
              onClick={onDismissed}
            ></s-button>
            <s-button
              accessibilityLabel="Toggle setup guide"
              variant="tertiary"
              tone="neutral"
              icon={guideExpanded ? "chevron-up" : "chevron-down"}
              onClick={() => setGuideExpanded((current) => !current)}
            ></s-button>
          </s-grid>
          <s-paragraph color="subdued">
            Use this guide to get your withdrawal form live on your storefront.
          </s-paragraph>
          <s-text color="subdued">
            {completedCount} of {setupSteps.length} tasks complete
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
                      accessibilityLabel={`Toggle ${step.label} details`}
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
                        {step.key === "extension" ? (
                          step.complete ? (
                            <s-box>
                              <s-banner tone="success">
                                The extension block is live on your order status page.
                              </s-banner>
                            </s-box>
                          ) : (
                            <OrderStatusExtensionStatus />
                          )
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
                              {step.onToggle && (
                                <s-checkbox
                                  label={step.checkboxLabel ?? step.label}
                                  checked={step.complete}
                                  onChange={(event) =>
                                    step.onToggle(event.currentTarget.checked)
                                  }
                                ></s-checkbox>
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
