import type { CSSProperties } from 'react';
import { MAX_OPTIONS, MIN_OPTIONS } from './view';
import type { QuizOption } from './view';

/**
 * **The television's options.** The same letters as the phone, in the same
 * order, large enough to read from three metres.
 *
 * *The same order, always.* The letter is the only thing tying a button in
 * somebody's hand to a line on the screen, so a grid that sorted or shuffled
 * would break the one reference the room shares. It renders `item.options` in
 * the order the frame gave them, and `correctOnly` is the single exception —
 * a reveal-time trim to one row, after the room has already read the rest.
 *
 * `correct` arrives only on a reveal step — the display frame has no answer in
 * it before then — so the green is a fact of the frame rather than a flag this
 * component has to be trusted to keep secret.
 */
interface OptionGridProps {
  options: QuizOption[];
  /** The winning key, on the reveal step alone. Null at every other moment. */
  correct?: string | null;
  /**
   * **Drop the losing rows and keep the one that went green.**
   *
   * Only ever true on a reveal that also has a picture to show, which is the
   * one moment the screen has more to say than it has room for: an explanation
   * image is the subject of that beat, and four rows of options the room has
   * already read are what it is competing with. Dimming them was enough when
   * the space was free — it isn't here.
   *
   * It needs `correct` to mean anything, and does nothing without it, so there
   * is no arrangement of props that can hide the answer before it is known.
   */
  correctOnly?: boolean;
}

export function OptionGrid({ options, correct, correctOnly }: OptionGridProps) {
  // The filter is a reveal-time trim, never a re-ordering: what survives keeps
  // its letter, which is the whole contract with the phones.
  const shown = correctOnly && correct ? options.filter(option => option.key === correct) : options;

  // Clamped to the kit's contract for sizing only — every option still renders,
  // however many the item turned out to have.
  const rows = Math.min(Math.max(options.length, MIN_OPTIONS), MAX_OPTIONS);

  return (
    <ul
      className={`option-grid${shown.length < options.length ? ' option-grid--solo' : ''}`}
      style={{ '--option-rows': rows } as CSSProperties}
    >
      {shown.map(option => (
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
