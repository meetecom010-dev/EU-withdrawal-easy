/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useState } from "react";

export default function FormFieldsEditor({ fields, onChange }) {
  const [newField, setNewField] = useState("");

  function handleAdd() {
    if (!newField.trim()) return;
    onChange([...fields, newField.trim()]);
    setNewField("");
  }

  function handleRemove(field) {
    onChange(fields.filter((f) => f !== field));
  }

  return (
    <s-stack direction="block" gap="base">
      <s-unordered-list>
        {fields.map((field) => (
          <s-list-item key={field}>
            {field}{" "}
            <s-button variant="tertiary" onClick={() => handleRemove(field)}>
              Remove
            </s-button>
          </s-list-item>
        ))}
      </s-unordered-list>
      <s-stack direction="inline" gap="base">
        <s-text-field
          label="New field"
          value={newField}
          onChange={(e) => setNewField(e.target.value)}
        />
        <s-button onClick={handleAdd}>Add field</s-button>
      </s-stack>
    </s-stack>
  );
}
