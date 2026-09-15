interface Props {
  /** An emoji, or anything else that reads as one — a spinner, say. */
  icon?: React.ReactNode;
  headline?: React.ReactNode;
  /** Accent is the default; `plain` is for the states nothing good happened in. */
  tone?: 'accent' | 'plain';
  children?: React.ReactNode;
}

// The small centred card an open call says its non-form states in — pages own
// the words, this owns the shape.
export default function Notice({ icon, headline, tone = 'accent', children }: Props) {
  return (
    <div className="frosted-card flex flex-col items-center gap-xs text-center py-sm">
      {icon && <div className="text-2xl">{icon}</div>}
      {headline && (
        <p className={`text-sm font-semibold${tone === 'accent' ? ' text-accent' : ''}`}>
          {headline}
        </p>
      )}
      {/* A div, not a p: the states that carry a countdown want two lines. */}
      {children && <div className="text-xs text-muted">{children}</div>}
    </div>
  );
}
