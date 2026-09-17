/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useRef } from "react";
import { EU_COUNTRIES } from "../constants";
import PickerChips from "./PickerChips";

const ALL_COUNTRY_CODES = EU_COUNTRIES.map((country) => country.code);

// Two-mode country selection, persisted as formSettings.countryMode: "all"
// makes every EU country eligible (the backend resolves it to the full list,
// see resolveFormSettings in ../constants.js), "specific" reveals the
// searchable picker for formSettings.euCountries. The radio is saved
// alongside the rest of the form via the contextual save bar.
export default function CountriesCard({ settings, update, errors, dismissError }) {
  // Leaving "specific" stashes the merchant's picks so switching back restores
  // them. Both directions have to round-trip exactly, otherwise flipping the
  // radio away and back would leave euCountries holding something other than
  // what was loaded and the save bar would stay up over a setting the merchant
  // had already put back.
  const stashedSelection = useRef(null);

  function handleModeChange(mode) {
    // Re-selecting the mode that's already active must not disturb the
    // selection built up below.
    if (mode === settings.countryMode) return;

    if (mode === "all") {
      stashedSelection.current = settings.euCountries;
      // "all" is stored as the explicit full list (see resolveFormSettings in
      // ../constants.js), so writing it here is what makes the comparison
      // against the loaded settings come out clean again.
      update("euCountries", ALL_COUNTRY_CODES);
    } else {
      // Nothing stashed means "all" was the loaded state — an empty selection
      // is the right starting point, since the resolved full 27 isn't a
      // meaningful one for someone who just asked for specific countries.
      update("euCountries", stashedSelection.current ?? []);
      stashedSelection.current = null;
    }

    update("countryMode", mode);
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
            onDismissError={() => dismissError("euCountries")}
          />
        )}
      </s-stack>
    </s-section>
  );
}
