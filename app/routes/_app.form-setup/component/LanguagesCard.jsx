/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { AVAILABLE_LANGUAGES } from "../constants";
import PickerChips from "./PickerChips";

export default function LanguagesCard({ settings, update }) {
  return (
    <s-section heading="Languages">
      <s-stack direction="block" gap="small-200">
        <s-paragraph color="subdued">
          The form automatically displays in the shopper&apos;s checkout language when that
          language is selected here.
        </s-paragraph>
        <PickerChips
          label="Languages"
          placeholder="Search languages..."
          items={AVAILABLE_LANGUAGES}
          selected={settings.languages}
          onChange={(languages) => update("languages", languages)}
          hint={
            settings.languages.length === 0
              ? "No languages selected — the form will display in English for everyone."
              : "Shoppers whose language isn't selected see the form in English."
          }
        />
      </s-stack>
    </s-section>
  );
}
