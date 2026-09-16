/**
 * **"12 / 15 locked in" — the server's two numbers, rendered.**
 *
 * Both halves come off the frame and neither is computed here. `expected` in
 * particular: `players.filter(p => p.connected).length` looks equivalent and is
 * the bug. `expected` is the exact number the server's auto-lock fires on, so a
 * second copy of that rule drifts — and it drifts *visibly*. Count everyone and
 * the television reads "12 / 15" at the precise moment the clock cuts short for
 * 12 of 12 present, which the room reads as the timer breaking rather than as
 * three people having their phones in their pockets.
 *
 * Same reasoning as `ReactionOption` in `protocol.ts`: the rule for what the
 * server does lives on the server, and the client is told the answer.
 */
interface LockedInCountProps {
  /** `answered.length` on the TV, `answeredCount` on a phone. */
  answered: number;
  /** `state.expected`. Never a roster filter. */
  expected: number;
  /** `lg` is three-metre sizing. */
  size?: 'sm' | 'lg';
}

export function LockedInCount({ answered, expected, size = 'sm' }: LockedInCountProps) {
  return (
    <p className={`locked-in locked-in--${size}`} role="status">
      <span className="locked-in__count">
        {answered} <span className="locked-in__of">/</span> {expected}
      </span>{' '}
      locked in
    </p>
  );
}
