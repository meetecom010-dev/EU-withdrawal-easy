/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
export default function PickerChips({ options, selected, onToggle }) {
  return (
    <s-stack direction="inline" gap="small-200">
      {options.map((option) => (
        <s-button
          key={option}
          variant={selected.includes(option) ? "primary" : "secondary"}
          onClick={() => onToggle(option)}
        >
          {option}
        </s-button>
      ))}
    </s-stack>
  );
}
