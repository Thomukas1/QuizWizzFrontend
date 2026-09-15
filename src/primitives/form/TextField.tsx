import { useId } from 'react';
import { Field } from './Field';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  // Hard caps how many characters can be typed (matches the backend rule).
  maxLength?: number;
  required?: boolean;
  error?: string;
  help?: string;
  placeholder?: string;
  type?: 'text' | 'email';
  // Fixed, non-editable text shown inside the field, before the input (e.g.
  // an "@" for a handle). Not part of the value.
  prefix?: string;
  // Shows a value the form set for the user rather than one they type (e.g. a
  // carousel selection). Deliberately not `disabled` — the value is meaningful
  // content, so it stays legible and gets read out.
  readOnly?: boolean;
}

// Labeled single-line text input. `maxLength` is enforced by the browser, so
// the value can never exceed it.
export function TextField({
  label,
  value,
  onChange,
  maxLength,
  required,
  error,
  help,
  placeholder,
  type = 'text',
  prefix,
  readOnly,
}: TextFieldProps) {
  const id = useId();
  const input = (
    <input
      id={id}
      type={type}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={e => onChange(e.target.value)}
      // With a prefix the wrapper carries the error styling instead.
      className={!prefix && error ? 'error' : undefined}
    />
  );

  return (
    <Field label={label} htmlFor={id} required={required} error={error} help={help}>
      {prefix ? (
        <div className={`input-affix${error ? ' error' : ''}`}>
          <span className="input-affix__prefix" aria-hidden="true">{prefix}</span>
          {input}
        </div>
      ) : input}
    </Field>
  );
}
