export interface ButtonGroupOption<T extends string> {
  value: T;
  label: string;
}

interface ButtonGroupProps<T extends string> {
  options: ButtonGroupOption<T>[];
  // `null` when nothing is selected yet.
  value: T | null;
  onChange: (value: T) => void;
  // Columns in the grid; defaults to one cell per option (single row).
  columns?: number;
}

// Single-select segmented control: a row/grid of toggle buttons where exactly
// one can be active. Pure control — wrap in <Field> for a label.
export function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
  columns,
}: ButtonGroupProps<T>) {
  return (
    <div
      className="field-group"
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, 1fr)` }}
    >
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          className={`toggle-btn-alt${value === option.value ? ' selected' : ''}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
