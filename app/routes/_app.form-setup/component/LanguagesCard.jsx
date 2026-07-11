/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { AVAILABLE_LANGUAGES } from "../constants";
import PickerChips from "./PickerChips";

export default function LanguagesCard({ settings, update }) {
  return (
    <s-section heading="Languages">
      <s-paragraph color="subdued">
        The form auto-displays in the shopper&apos;s checkout language. Fallback: English.
      </s-paragraph>
      <PickerChips
        label="Languages"
        placeholder="Search languages..."
        items={AVAILABLE_LANGUAGES}
        selected={settings.languages}
        onChange={(languages) => update("languages", languages)}
      />
    </s-section>
  );
}
