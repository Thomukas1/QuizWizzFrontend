interface StepNavProps {
  count: number;
  // Index of the step currently shown.
  active: number;
  // Per-step completion — drives the "done" (green) styling.
  complete: boolean[];
  onSelect: (index: number) => void;
  ariaLabel?: string;
}

// A row of numbered step buttons (1..count). The active step is highlighted and
// completed steps turn green, so progress through a grouped set of inputs is
// glanceable. Pure navigation — the caller owns the active index and content.
export function StepNav({ count, active, complete, onSelect, ariaLabel }: StepNavProps) {
  return (
    <div className="step-nav" role="tablist" aria-label={ariaLabel}>
      {Array.from({ length: count }, (_, i) => {
        const classes = [
          'step-nav__btn',
          i === active ? 'is-active' : '',
          complete[i] ? 'is-complete' : '',
        ].filter(Boolean).join(' ');
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`Step ${i + 1}${complete[i] ? ' (complete)' : ''}`}
            className={classes}
            onClick={() => onSelect(i)}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
