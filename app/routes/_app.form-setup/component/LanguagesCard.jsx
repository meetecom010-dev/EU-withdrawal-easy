/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { AVAILABLE_LANGUAGES, BASE_LOCALE } from "../constants";
import { fillTranslationDefaults } from "../translations";
import PickerChips from "./PickerChips";

// The languages the form is offered in. English is the always-on base and
// can't be removed; every other language added here gains a tab in the form
// builder above, where the merchant translates the copy. A shopper on the
// order status page automatically sees their checkout language when it's one
// of these (and a translation exists), falling back to English otherwise.
export default function LanguagesCard({ settings, update }) {
  const languages = settings.languages ?? [BASE_LOCALE];
  const extraLanguages = languages.filter((code) => code !== BASE_LOCALE);

  return (
    <s-section heading="Languages">
      <s-stack direction="block" gap="small-200">
        <s-paragraph color="subdued">
          English is always included as the base. Add a language to get a tab in the form builder
          where you can translate the copy — shoppers automatically see their checkout language
          when it&apos;s available.
        </s-paragraph>
        <PickerChips
          label="Languages"
          placeholder="Search languages..."
          items={AVAILABLE_LANGUAGES}
          selected={languages}
          onChange={(picked) => {
            // English is the base language and stays selected no matter what —
            // the form always has a complete English copy to fall back to.
            const next = picked.includes(BASE_LOCALE) ? picked : [BASE_LOCALE, ...picked];
            // Prefill each newly added language with its default translation so
            // its tab opens on complete, professional copy instead of blanks.
            const added = next.filter((code) => code !== BASE_LOCALE && !languages.includes(code));
            if (added.length > 0) {
              const englishOptions = settings.reasonField?.options ?? [];
              const seeded = { ...(settings.translations ?? {}) };
              for (const code of added) {
                seeded[code] = fillTranslationDefaults(
                  code,
                  settings.labels,
                  englishOptions,
                  settings.translations?.[code],
                );
              }
              update("translations", seeded);
            }
            update("languages", next);
          }}
          hint={
            extraLanguages.length === 0
              ? "Only English is offered. Add a language to translate the form."
              : "Shoppers whose language isn't offered see the form in English."
          }
        />
      </s-stack>
    </s-section>
  );
}
