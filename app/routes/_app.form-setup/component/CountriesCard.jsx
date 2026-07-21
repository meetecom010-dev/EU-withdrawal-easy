/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { EU_COUNTRIES } from "../constants";
import PickerChips from "./PickerChips";

// Two-mode country selection, persisted as formSettings.countryMode: "all"
// makes every EU country eligible (the backend resolves it to the full list,
// see resolveFormSettings in ../constants.js), "specific" reveals the
// searchable picker for formSettings.euCountries. The radio is saved
// alongside the rest of the form via the contextual save bar.
export default function CountriesCard({ settings, update, errors }) {
  function handleModeChange(mode) {
    update("countryMode", mode);
    // Switching to "specific" starts from an empty selection — the resolved
    // list in "all" mode is the full 27, which isn't a meaningful starting
    // point for someone who just said they want only specific countries.
    if (mode === "specific") {
      update("euCountries", []);
    }
  }

  return (
    <s-section heading="Eligible countries">
      <s-stack direction="block" gap="small-200">
        <s-paragraph color="subdued">
          Customers outside these countries won&apos;t see the withdrawal form.
        </s-paragraph>

        <s-choice-list
          label="Eligible countries"
          labelAccessibilityVisibility="exclusive"
          name="countryMode"
          values={[settings.countryMode]}
          error={errors?.countryMode}
          onChange={(e) => handleModeChange(e.currentTarget.values[0])}
        >
          <s-choice value="all">
            All {EU_COUNTRIES.length} EU countries (recommended)
            <s-text slot="details">The right of withdrawal applies EU-wide.</s-text>
          </s-choice>
          <s-choice value="specific">
            Only specific countries
            <s-text slot="details">Pick them below — you can change this any time.</s-text>
          </s-choice>
        </s-choice-list>

        {settings.countryMode === "specific" && (
          <PickerChips
            label="Countries"
            placeholder="Search countries..."
            items={EU_COUNTRIES}
            selected={settings.euCountries}
            onChange={(countries) => update("euCountries", countries)}
            error={errors?.euCountries}
          />
        )}
      </s-stack>
    </s-section>
  );
}
