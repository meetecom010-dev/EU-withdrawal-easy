/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { EU_COUNTRIES } from "../constants";
import PickerChips from "./PickerChips";

export default function CountriesCard({ settings, update, errors }) {
  return (
    <s-section heading="Countries">
      <PickerChips
        label="Countries"
        placeholder="Search countries..."
        items={EU_COUNTRIES}
        selected={settings.euCountries}
        onChange={(countries) => update("euCountries", countries)}
        error={errors?.euCountries}
      />
    </s-section>
  );
}
