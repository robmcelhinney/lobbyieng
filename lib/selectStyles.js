export const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "40px",
    backgroundColor: state.isFocused ? "var(--ui-input-hover)" : "var(--ui-input-bg)",
    borderColor: state.isFocused ? "var(--ui-primary)" : "var(--ui-border)",
    boxShadow: state.isFocused ? "0 0 0 1px var(--ui-primary)" : "none",
    color: "var(--ui-text)",
    "&:hover": {
      borderColor: "var(--ui-primary)"
    }
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "var(--ui-surface)",
    border: "1px solid var(--ui-border)",
    boxShadow: "0 16px 32px rgba(4, 12, 32, 0.28)",
    color: "var(--ui-text)",
    overflow: "hidden",
    zIndex: 9999
  }),
  menuList: (base) => ({
    ...base,
    padding: "4px"
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "var(--ui-option-selected)"
      : state.isFocused
        ? "var(--ui-option-focus)"
        : "transparent",
    borderRadius: "4px",
    color: "var(--ui-text)",
    cursor: "pointer",
    "&:active": {
      backgroundColor: "var(--ui-option-selected)"
    }
  }),
  singleValue: (base) => ({
    ...base,
    color: "var(--ui-text)"
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "var(--ui-bg-soft)",
    border: "1px solid var(--ui-border)",
    borderRadius: "4px"
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "var(--ui-text)"
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "var(--ui-muted)",
    "&:hover": {
      backgroundColor: "var(--ui-option-focus)",
      color: "var(--ui-text)"
    }
  }),
  input: (base) => ({
    ...base,
    color: "var(--ui-text)"
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--ui-muted)"
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: "var(--ui-border)"
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? "var(--ui-primary)" : "var(--ui-muted)",
    "&:hover": {
      color: "var(--ui-primary)"
    }
  }),
  clearIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? "var(--ui-primary)" : "var(--ui-muted)",
    "&:hover": {
      color: "var(--ui-primary)"
    }
  })
}
