import { useCountdown } from '../../hooks/quizwizz';
import type { Deadline } from '../../services/quizwizz';

/**
 * **3 · 2 · 1 — the transition between a rules card and the first question.**
 *
 * Match-3 needed it because dropping a room straight from a held card into an
 * eight-second item wastes the first one; it turns out every format wants it,
 * because a rules card is read at the room's pace and a question is not, and the
 * three seconds between them are where everybody puts their phone in their hand.
 *
 * Its own component, and the digit inside it is another one, so that only the
 * number re-renders on the tick. {@link useCountdown} runs at 10Hz and a display
 * that subscribes to it directly repaints the whole screen ten times a second —
 * which is the same reason `<Timer>` owns its own countdown rather than being
 * handed a number.
 */

/**
 * The id a format's countdown step is expected to use.
 *
 * Typed `string` for the reason {@link RULES_STEP} is: a step the server has not
 * declared yet is absent from the format's copied step union, and comparing
 * against a literal it has never heard of is a type error rather than a branch
 * that quietly never runs.
 */
export const COUNTDOWN_STEP: string = 'countdown';

/**
 * The number alone. Keyed on the digit, so each second is a new element and the
 * pop runs once per number instead of once per countdown.
 */
function CountdownDigit({ deadline }: { deadline: Deadline | null }) {
  const { ms } = useCountdown(deadline);

  // Ceiling, like `<Timer>`: 200ms left still reads 1. A zero on a starting gun
  // is a frame nobody needs to see.
  const digit = Math.max(1, Math.ceil(ms / 1000));

  return <p key={digit} className="quiz-countdown">{digit}</p>;
}

interface CountdownProps {
  /** The step's own deadline, off the frame. The digit counts against it. */
  deadline: Deadline | null;
  /**
   * What stays on screen above the number — Match-3's topic, so the thing the
   * room is about to answer twenty instances of does not blink out for three
   * seconds and come back. Omit it and the digit has the card to itself.
   */
  label?: string | null;
}

export function Countdown({ deadline, label }: CountdownProps) {
  return (
    <div className="quiz-display quiz-card quiz-card--countdown">
      {label && <span className="quiz-card__label">{label}</span>}
      <CountdownDigit deadline={deadline} />
    </div>
  );
}
