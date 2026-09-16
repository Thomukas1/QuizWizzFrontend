import type { CSSProperties } from 'react';
import { MAX_OPTIONS, MIN_OPTIONS } from './view';
import type { QuizOption } from './view';

/**
 * **The television's options.** The same letters as the phone, in the same
 * order, large enough to read from three metres.
 *
 * *The same order, always.* The letter is the only thing tying a button in
 * somebody's hand to a line on the screen, so a grid that sorted, filtered or
 * shuffled would break the one reference the room shares. It renders
 * `item.options` exactly as the frame gave them.
 *
 * `correct` arrives only on a reveal step — the display frame has no answer in
 * it before then — so the green is a fact of the frame rather than a flag this
 * component has to be trusted to keep secret.
 */
interface OptionGridProps {
  options: QuizOption[];
  /** The winning key, on the reveal step alone. Null at every other moment. */
  correct?: string | null;
}

export function OptionGrid({ options, correct }: OptionGridProps) {
  // Clamped to the kit's contract for sizing only — every option still renders,
  // however many the item turned out to have.
  const rows = Math.min(Math.max(options.length, MIN_OPTIONS), MAX_OPTIONS);

  return (
    <ul className="option-grid" style={{ '--option-rows': rows } as CSSProperties}>
      {options.map(option => (
        <li
          key={option.key}
          className={
            'option-grid__row' +
            (correct ? (correct === option.key ? ' option-grid__row--correct' : ' option-grid__row--dim') : '')
          }
        >
          <span className="option-grid__key" aria-hidden="true">{option.key}</span>
          <span className="option-grid__label">{option.label}</span>
        </li>
      ))}
    </ul>
  );
}
