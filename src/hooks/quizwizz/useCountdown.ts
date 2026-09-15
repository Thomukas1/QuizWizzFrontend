import { useEffect, useState } from 'react';
import { fractionLeft, remaining } from '../../services/quizwizz';
import type { Deadline } from '../../services/quizwizz';

/**
 * **The** timer, and the only thing in the app that counts down.
 *
 * There is exactly one deadline at a time because there is exactly one current
 * `ViewFrame`, which is where it rides — `state.view.deadline`, never a field of
 * its own. It moved there when the six phases became four: a game now runs its
 * intro, its questions and its reveals inside a single `GAME` phase, so a
 * deadline hung off the phase could only be set once per game.
 *
 * Driven by `serverNow()`, never `Date.now()`: the deadline is an absolute
 * *server* timestamp, and a phone whose clock is a minute fast would otherwise
 * render a round that ended before it started.
 *
 * 100ms is a tenth of the smallest thing a bar can show moving, and cheap enough
 * for forty phones. Note it counts to zero and stops there — the submit button
 * must stay live until the deadline actually passes, because the server accepts
 * up to `SUBMIT_GRACE_MS` past it and clamps the recorded time.
 */
const TICK_MS = 100;

export function useCountdown(deadline: Deadline | null) {
  const [ms, setMs] = useState(() => remaining(deadline));
  const [fraction, setFraction] = useState(() => fractionLeft(deadline));

  useEffect(() => {
    const tick = () => {
      setMs(remaining(deadline));
      setFraction(fractionLeft(deadline));
    };
    tick(); // paint the new deadline now, not one tick from now
    if (!deadline) return;
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [deadline]);

  return { ms, fraction, expired: ms <= 0 };
}
