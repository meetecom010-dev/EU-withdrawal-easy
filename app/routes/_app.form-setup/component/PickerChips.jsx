/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { useEffect, useRef, useState } from "react";

// Inline searchable multi-select: type to filter, check items in the
// dropdown to add them, remove via the chip's own "x". Shared by EU
// countries and languages so both behave identically.
export default function PickerChips({ label, placeholder, items, selected, onChange, hint, error }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function toggle(code, checked) {
    onChange(checked ? [...selected, code] : selected.filter((c) => c !== code));
  }

  return (
    <s-stack direction="block" gap="small-200">
      <s-box ref={containerRef}>
        <s-stack direction="block" gap="small-200">
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-search-field
              label={label}
              labelAccessibilityVisibility="exclusive"
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.currentTarget.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
            ></s-search-field>
            <s-badge>{selected.length} selected</s-badge>
          </s-stack>

          {hint && <s-text color="subdued">{hint}</s-text>}
          {error && <s-text tone="critical">{error}</s-text>}

          {open && (
            <s-box border="base" borderRadius="base" padding="small-200">
              <s-stack direction="block" gap="small-200">
                <s-stack direction="inline" gap="small-200">
                  <s-button variant="tertiary" onClick={() => onChange(items.map((i) => i.code))}>
                    Select all
                  </s-button>
                  <s-button variant="tertiary" onClick={() => onChange([])}>
                    Clear all
                  </s-button>
                </s-stack>

                <s-divider></s-divider>

                {filtered.length === 0 && (
                  <s-text color="subdued">No matches for &quot;{query}&quot;.</s-text>
                )}
                {filtered.map((item) => (
                  <s-checkbox
                    key={item.code}
                    label={item.name}
                    checked={selected.includes(item.code)}
                    onChange={(e) => toggle(item.code, e.currentTarget.checked)}
                  ></s-checkbox>
                ))}
              </s-stack>
            </s-box>
          )}
        </s-stack>
      </s-box>

      <s-stack direction="inline" gap="small-200">
        {selected.map((code) => {
          const item = items.find((i) => i.code === code);
          return (
            <s-clickable-chip
              key={code}
              removable
              onRemove={() => onChange(selected.filter((c) => c !== code))}
            >
              {item ? item.name : code}
            </s-clickable-chip>
          );
        })}
      </s-stack>
    </s-stack>
  );
}
