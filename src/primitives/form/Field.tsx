import { ReactNode } from 'react';

interface FieldProps {
  label: string;
  // Associates the <label> with the control. Omit for controls without a
  // single focusable element (e.g. a button group).
  htmlFor?: string;
  required?: boolean;
  error?: string;
  // Short hint shown as a muted parenthetical next to the label (e.g.
  // "optional"), not a line beneath the field.
  help?: string;
  // Render the label as a prominent prompt rather than a small form label —
  // for fields where the label is the focus (e.g. a question or statement).
  largeLabel?: boolean;
  children: ReactNode;
}

// Labeling shell shared by every form field: renders the label (with the
// required marker and an optional inline hint), the control, and an error
// message beneath it.
export function Field({ label, htmlFor, required, error, help, largeLabel, children }: FieldProps) {
  const labelClasses = [required ? 'required' : '', largeLabel ? 'field-label--lg' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className="field-wrapper">
      <label htmlFor={htmlFor} className={labelClasses || undefined}>
        {label}
        {help && <span className="field-label-hint"> ({help})</span>}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
