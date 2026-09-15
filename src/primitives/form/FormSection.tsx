import { ReactNode } from 'react';

interface FormSectionProps {
  title?: string;
  description?: string;
  // Surfaced under the section header (e.g. a group-level validation error).
  error?: string;
  children: ReactNode;
}

// A visually distinct group of fields — a filled "card" panel that reads as a
// separate phase of the form. Reusable for any grouped tier (audition, scale…).
export function FormSection({ title, description, error, children }: FormSectionProps) {
  return (
    <section className="form-section">
      {(title || description) && (
        <header className="form-section__head">
          {title && <h2 className="form-section__title">{title}</h2>}
          {description && <p className="form-section__desc">{description}</p>}
        </header>
      )}
      <div className="form-section__body">{children}</div>
      {error && <p className="field-error">{error}</p>}
    </section>
  );
}
