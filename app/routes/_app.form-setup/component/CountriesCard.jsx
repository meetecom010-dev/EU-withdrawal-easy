/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { EU_COUNTRIES } from "../constants";
import PickerChips from "./PickerChips";

export default function CountriesCard({ settings, update }) {
  return (
    <s-section heading="Countries">
      <PickerChips
        label="Countries"
        placeholder="Search countries..."
        hint="All 27 EU member states are selected by default."
        items={EU_COUNTRIES}
        selected={settings.euCountries}
        onChange={(countries) => update("euCountries", countries)}
      />
    </s-section>
  );
}
