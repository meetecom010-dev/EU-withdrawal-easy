/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";

// Polaris web components have no disclosure/accordion primitive, so the
// collapsible row is built here from s-clickable (which takes box props, so it
// can be the full-width header) plus a chevron that flips with the state.
// Rows open independently — an FAQ is read by hunting, not step by step, so
// closing one answer to open another would only get in the way.

function FaqItem({ faq, isOpen, onToggle }) {
  const answerId = `faq-answer-${faq.id}`;

  return (
    <s-box border="base" borderRadius="base">
      <s-clickable
        onClick={onToggle}
        padding="base"
        inlineSize="100%"
        borderRadius="base"
        accessibilityLabel={`${isOpen ? "Hide" : "Show"} answer: ${faq.question}`}
        aria-expanded={isOpen}
        aria-controls={answerId}
      >
        <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
          <s-text type="strong">{faq.question}</s-text>
          <s-icon type={isOpen ? "chevron-up" : "chevron-down"} color="subdued"></s-icon>
        </s-stack>
      </s-clickable>

      {isOpen && (
        <s-box id={answerId} padding="base" paddingBlockStart="none">
          <s-stack direction="block" gap="small-200">
            {faq.paragraphs.map((paragraph) => (
              <s-text key={paragraph} color="subdued">
                {paragraph}
              </s-text>
            ))}

            {faq.bullets && (
              <s-unordered-list>
                {faq.bullets.map((bullet) => (
                  <s-list-item key={bullet}>
                    <s-text color="subdued">{bullet}</s-text>
                  </s-list-item>
                ))}
              </s-unordered-list>
            )}

            {faq.closing && <s-text color="subdued">{faq.closing}</s-text>}
          </s-stack>
        </s-box>
      )}
    </s-box>
  );
}

export default function FaqAccordion({ faqs }) {
  const [openIds, setOpenIds] = useState([]);
  const allOpen = openIds.length === faqs.length;

  function toggle(id) {
    setOpenIds((current) =>
      current.includes(id) ? current.filter((openId) => openId !== id) : [...current, id],
    );
  }

  return (
    <s-stack direction="block" gap="base">
      <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
        <s-text color="subdued">
          {`${faqs.length} answers to the questions we're asked most.`}
        </s-text>
        <s-button variant="tertiary" onClick={() => setOpenIds(allOpen ? [] : faqs.map((faq) => faq.id))}>
          {allOpen ? "Collapse all" : "Expand all"}
        </s-button>
      </s-stack>

      {faqs.map((faq) => (
        <FaqItem
          key={faq.id}
          faq={faq}
          isOpen={openIds.includes(faq.id)}
          onToggle={() => toggle(faq.id)}
        />
      ))}
    </s-stack>
  );
}
