import { useEffect, useRef, useState } from 'react';

export interface DropdownOption {
  value: string;
  // Optional leading visual (e.g. a zodiac emoji). Omit for plain dropdowns.
  emoji?: string;
}

// Options can be plain strings (no visual) or objects carrying an emoji.
type DropdownItem = string | DropdownOption;

interface DropdownProps {
  options: DropdownItem[];
  // `null` when nothing is selected — the placeholder shows instead.
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  id?: string;
}

const normalize = (option: DropdownItem): DropdownOption =>
  typeof option === 'string' ? { value: option } : option;

// Custom single-select dropdown with a height-capped, scrollable options panel
// — a native <select> popup can't be sized/scrolled this way. Closes on
// outside click, Escape, or selection.
export function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select',
  error,
  id,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const items = options.map(normalize);
  const selected = items.find(item => item.value === value) ?? null;

  const select = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`dropdown${open ? ' open' : ''}`}>
      <button
        type="button"
        id={id}
        className={`dropdown-trigger${value ? '' : ' placeholder'}${error ? ' error' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className="dropdown-value">
          {selected?.emoji && <span className="dropdown-emoji" aria-hidden="true">{selected.emoji}</span>}
          <span>{selected?.value ?? placeholder}</span>
        </span>
        <span className="dropdown-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="dropdown-panel" role="listbox">
          {items.map(item => (
            <button
              key={item.value}
              type="button"
              role="option"
              aria-selected={value === item.value}
              className={`dropdown-option${value === item.value ? ' selected' : ''}`}
              onClick={() => select(item.value)}
            >
              {item.emoji && <span className="dropdown-emoji" aria-hidden="true">{item.emoji}</span>}
              <span>{item.value}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
