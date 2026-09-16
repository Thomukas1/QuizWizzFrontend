import type { CSSProperties } from 'react';
import { MAX_OPTIONS, MIN_OPTIONS } from './view';
import type { QuizOption, QuizOutcome } from './view';

/**
 * **The phone's tap targets.** 2–4 of them, letter and label, filling the thumb
 * half of the screen.
 *
 * No prompt, here or anywhere on a phone: the question stays on the television
 * so everyone's eyes stay up and the room stays social, and it means a phone's
 * payload has nothing in it worth opening devtools for.
 *
 * **Three states, not two.** `usePlayerActions` holds no optimistic state and
 * the registry's prop comment says to wait for `answer:ack` before showing a
 * choice as locked in. That rule is right — a rejected submission must never
 * leave a phone claiming an answer the server didn't take — but a 30-second
 * question on bad hotel wifi cannot feel dead for a round trip either. So a tap
 * is *pending* until something confirms it, which claims nothing and still
 * answers the thumb. `useAnswerLock` runs that machine; this renders it.
 *
 * The correct key is never in a player frame in any form, at any step, so the
 * reveal decorates the player's **own** choice from `outcome` and nothing else.
 * That is structural rather than a habit: there is no `correct` prop to pass.
 */
interface OptionButtonsProps {
  options: QuizOption[];
  /**
   * Locked in — confirmed by an ack or echoed back on the frame. Non-null is
   * the locked state itself; it is never tracked separately.
   */
  chosen: string | null;
  /** Tapped, not yet acknowledged. Nothing here claims the server took it. */
  pending: string | null;
  /** The buttons aren't live: an intro, a lock, a reveal. */
  disabled: boolean;
  onPick: (key: string) => void;
  /** Set on the reveal step. Decorates `chosen`, never the whole row. */
  outcome?: QuizOutcome | null;
}

export function OptionButtons({
  options,
  chosen,
  pending,
  disabled,
  onPick,
  outcome,
}: OptionButtonsProps) {
  // The row count the grid divides its height by, clamped to the kit's own
  // contract: two options get two tall targets rather than two slabs and two
  // empty rows, and a malformed item with six still renders all six — smaller,
  // rather than off the bottom of the phone.
  const rows = Math.min(Math.max(options.length, MIN_OPTIONS), MAX_OPTIONS);

  return (
    <div className="options" style={{ '--option-rows': rows } as CSSProperties}>
      {options.map(option => {
        const isChosen = chosen === option.key;
        const isPending = !chosen && pending === option.key;

        return (
          <button
            key={option.key}
            type="button"
            // Every button goes dead the moment one is tapped. A first
            // submission wins and there is no way to replace it, so leaving the
            // others live would only offer a tap that earns `already_answered`.
            disabled={disabled || !!chosen || !!pending}
            aria-pressed={isChosen}
            className={
              'option' +
              (isChosen ? ' option--chosen' : '') +
              (isPending ? ' option--pending' : '') +
              (isChosen && outcome ? ` option--${outcome}` : '')
            }
            onClick={() => onPick(option.key)}
          >
            <span className="option__key" aria-hidden="true">{option.key}</span>
            <span className="option__label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
