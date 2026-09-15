import { Dropdown } from './Dropdown';

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  // Hard cap on selections — the add-picker hides once reached. The minimum is
  // the consumer's validity concern (a required field implies at least one).
  max: number;
  addPlaceholder?: string;
}

// Multi-select rendered as removable pills, with remaining options added one at
// a time through the scrollable Dropdown. Suits long option lists where a flat
// toggle grid would be unwieldy.
export function MultiSelect({
  options,
  value,
  onChange,
  max,
  addPlaceholder = 'Add…',
}: MultiSelectProps) {
  const remaining = options.filter(option => !value.includes(option));
  const add = (option: string) => {
    if (value.length < max) onChange([...value, option]);
  };
  const remove = (option: string) => onChange(value.filter(v => v !== option));

  return (
    <div className="multiselect">
      {value.length > 0 && (
        <ul className="multiselect__pills">
          {value.map(item => (
            <li key={item} className="pill">
              <span>{item}</span>
              <button
                type="button"
                className="pill__remove"
                aria-label={`Remove ${item}`}
                onClick={() => remove(item)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.length < max && remaining.length > 0 && (
        <Dropdown
          options={remaining}
          value={null}
          onChange={add}
          placeholder={addPlaceholder}
        />
      )}
    </div>
  );
}
