import type { CSSProperties } from 'react';
import { useCountdown } from '../hooks/quizwizz';
import { isVisible, secondsLeft } from '../services/quizwizz';
import type { Deadline } from '../services/quizwizz';

/**
 * **The clock, one component, both screens.**
 *
 * At the root of `components/` rather than under `games/`, and that placement is
 * the whole design: a quiz counts a question down with it, a reaction minigame
 * counts down sixty seconds of popping balloons with it, and neither knows the
 * other exists. The server calls the distinction **kits and tools** — a kit is
 * game-shaped and only some games want it; a tool knows nothing about any game.
 *
 * **It branches on `deadline.kind`, never on a step id.** Branching on step is
 * what would silently make this quiz-only, because a step id belongs to one
 * format and `kind` belongs to the clock:
 *
 * | `kind` | Render |
 * |---|---|
 * | `prepare` | A lead-in. No race, no urgency, nothing to act on yet |
 * | `live` | The main event, and the biggest thing on the screen |
 * | `lastChance` | Short and urgent — everyone else is already in |
 * | `beat` | **Nothing.** A drumroll is not a clock |
 *
 * The words are the client's on purpose: the server ships no label, because
 * "Get ready" is copy and copy belongs to the side with the fonts, the room to
 * put it in and the language to say it in.
 */

/**
 * What each clock says above the bar. `live` is deliberately silent — the digit
 * is the message, and a word beside it is one more thing to read in the second
 * somebody has to answer.
 */
const LABELS: Record<Deadline['kind'], string | null> = {
  prepare: 'Get ready',
  live: null,
  lastChance: 'Last chance',
  beat: null,
};

interface TimerProps {
  /** Off the frame — `view.deadline`, handed down by the mount point. */
  deadline: Deadline | null;
  /** `lg` is three-metre sizing. */
  size?: 'sm' | 'lg';
}

export function Timer({ deadline, size = 'sm' }: TimerProps) {
  // Called unconditionally, and given a null deadline on the steps that have
  // none: a hook before an early return is a hook that is always called.
  const { fraction } = useCountdown(deadline);

  // A beat, or a step with no clock at all. `isVisible` is the server's rule
  // about which of its own deadlines the room is meant to watch, so asking it
  // beats a `kind !== 'beat'` written at each render site.
  if (!isVisible(deadline) || !deadline) return null;

  const label = LABELS[deadline.kind];

  return (
    /*
      Keyed on the deadline's identity so a replaced clock *snaps*.

      The auto-lock does not end a live clock — it truncates it to a shorter
      `lastChance` one — so the bar's width jumps backwards, and without a key
      change React keeps the same element and the CSS transition glides it there
      over 100ms. A glide reads as the timer losing time smoothly; the snap is
      the truth, which is that everyone else is already in.
    */
    <div
      key={`${deadline.startedAt}-${deadline.endsAt}-${deadline.kind}`}
      className={`timer timer--${deadline.kind} timer--${size}`}
      style={{ '--timer-fraction': fraction } as CSSProperties}
      role="timer"
      aria-label={label ?? 'Time remaining'}
    >
      <div className="timer__readout">
        {label && <span className="timer__label">{label}</span>}
        {/*
          Ceiling, not floor. A clock with 200ms left still reads 1, and reaches
          0 only when it is genuinely over — and even then the buttons stay
          live, because the server accepts up to SUBMIT_GRACE_MS past `endsAt`
          and clamps the recorded time. The grace exists so a slow connection
          isn't robbed; the clamp makes sure it buys nothing.
        */}
        <span className="timer__seconds">{secondsLeft(deadline)}</span>
      </div>

      <div className="timer__track">
        <div className="timer__fill" />
      </div>
    </div>
  );
}
