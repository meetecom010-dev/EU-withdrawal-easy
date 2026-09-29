/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// Polaris web components have no disclosure/accordion primitive. Each question
// is a neutral-tone s-link: it reads as plain text, underlines on hover, and
// never paints a background (s-clickable always shows a grey hover and focus
// fill, which looked wrong on an FAQ list). The chevron beside it flips with
// the state. Rows open independently — an FAQ is read by hunting, not step by
// step, so closing one answer to open another would only get in the way.

function FaqItem({ faq, isOpen, onToggle }) {
  const { t } = useTranslation();
  const answerId = `faq-answer-${faq.id}`;

  // The open question's row gets a soft background so it's clear which answer
  // is showing. Closed rows keep the same padding with no background, so the
  // text lines up either way.
  return (
    <s-box>
      <s-box
        background={isOpen ? "subdued" : "transparent"}
        borderRadius="base"
        paddingBlock="small-200"
        paddingInline="base"
      >
        <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
          <s-link
            tone="neutral"
            onClick={onToggle}
            accessibilityLabel={t(isOpen ? "faqs.hideAnswer" : "faqs.showAnswer", {
              question: faq.question,
            })}
            aria-expanded={isOpen}
            aria-controls={answerId}
          >
            <s-text type="strong">{faq.question}</s-text>
          </s-link>
          <s-icon type={isOpen ? "chevron-up" : "chevron-down"} color="subdued"></s-icon>
        </s-grid>
      </s-box>

      {isOpen && (
        <s-box
          id={answerId}
          paddingInlineStart="base"
          paddingInlineEnd="large-200"
          paddingBlock="base"
        >
          <s-stack direction="block" gap="base">
            {faq.paragraphs.map((paragraph) => (
              <s-paragraph key={paragraph}>{paragraph}</s-paragraph>
            ))}

            {faq.bullets && (
              <s-unordered-list>
                {faq.bullets.map((bullet) => (
                  <s-list-item key={bullet}>{bullet}</s-list-item>
                ))}
              </s-unordered-list>
            )}

            {faq.closing && <s-paragraph>{faq.closing}</s-paragraph>}

            {faq.action && (
              <s-stack direction="inline">
                <s-link href={faq.action.href}>{t(`faqs.actions.${faq.action.labelKey}`)}</s-link>
              </s-stack>
            )}
          </s-stack>
        </s-box>
      )}
    </s-box>
  );
}

// Everything an FAQ says, lowercased, so search matches answers as well as
// questions ("refund" finds the return question too).
function searchableText(faq) {
  return [faq.question, ...faq.paragraphs, ...(faq.bullets ?? []), faq.closing ?? ""]
    .join(" ")
    .toLowerCase();
}

// The FAQ page body: a search field, then one card per topic with its
// questions as a divided list. Searching filters every topic and opens the
// matching answers, so the result is readable without extra clicks.
export default function FaqAccordion({ groups }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState([]);

  const trimmed = query.trim().toLowerCase();
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      faqs: trimmed
        ? group.faqs.filter((faq) => searchableText(faq).includes(trimmed))
        : group.faqs,
    }))
    .filter((group) => group.faqs.length > 0);

  // A new search opens every match; clearing it closes them again. The ids
  // are recomputed from the query alone so this only runs when it changes.
  useEffect(() => {
    if (!trimmed) {
      setOpenIds([]);
      return;
    }
    setOpenIds(
      groups.flatMap((group) =>
        group.faqs.filter((faq) => searchableText(faq).includes(trimmed)).map((faq) => faq.id),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the query only
  }, [trimmed]);

  function toggle(id) {
    setOpenIds((current) =>
      current.includes(id) ? current.filter((openId) => openId !== id) : [...current, id],
    );
  }

  return (
    <>
      <s-section>
        <s-search-field
          label={t("faqs.searchLabel")}
          labelAccessibilityVisibility="exclusive"
          placeholder={t("faqs.searchPlaceholder")}
          value={query}
          onInput={(event) => setQuery(event.currentTarget.value)}
        ></s-search-field>
      </s-section>

      {visibleGroups.length === 0 && (
        <s-section>
          <s-stack direction="block" gap="small-200" alignItems="center" padding="large none">
            <s-text type="strong">{t("faqs.noResults", { query: query.trim() })}</s-text>
            <s-text color="subdued">{t("faqs.noResultsHelp")}</s-text>
          </s-stack>
        </s-section>
      )}

      {visibleGroups.map((group) => (
        <s-section key={group.id} heading={group.heading}>
          <s-stack direction="block" gap="small-200">
            {group.faqs.map((faq) => (
              <FaqItem
                key={faq.id}
                faq={faq}
                isOpen={openIds.includes(faq.id)}
                onToggle={() => toggle(faq.id)}
              />
            ))}
          </s-stack>
        </s-section>
      ))}
    </>
  );
}
