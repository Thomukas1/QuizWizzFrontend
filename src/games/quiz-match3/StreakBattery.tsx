import type { CSSProperties } from 'react';
import type { Match3Beat } from './view';

/**
 * **The phone's charge pack.** Fill every cell and it pays out; miss one and it
 * empties.
 *
 * This is the format's whole rule in one object, and it is on the phone rather
 * than the television because it is the one thing about this game that is
 * personal. The television deliberately shows no streaks at all — it shows the
 * people who just banked one, flying up it — so this is the only place a streak
 * is drawn, and it is **current**: the cell fills on the tap, which is the point
 * of it. It runs up to ten seconds ahead of anything the room sees, until the
 * hold, where the room catches up. That gap is the design rather than a drift to
 * reconcile.
 *
 * A battery rather than a row of dots because a battery already means what this
 * needs to mean. Three lit dots is a score. Three of three cells full is a thing
 * about to happen — you can see how close it is without reading it, which is the
 * entire job at ten seconds an item with a thumb over the buttons.
 *
 * ## The full pack is an animation, never a state
 *
 * `streak` is `0` to `streakLength - 1` and **never `streakLength`**: the fold
 * banks on the last one and resets in the same step, so a frame never carries a
 * full pack. If the payoff were drawn from the numbers it would never be drawn
 * at all — the cell would light and vanish between two frames, and banking would
 * feel like losing the streak.
 *
 * So the payoff comes off `last`, which is the server's word for what the item
 * just did, and the pack plays it: **fill, flare, discharge**. Same for `burn`,
 * which arrives as the same `streak: 0` and is a completely different event —
 * the cells they had drop out of it in red. `miss` animates nothing, because
 * nothing was lost.
 *
 * `beat` is the caller's gate, not this component's: `last` belongs to the
 * previous item until its owner answers the one on screen, so replaying it on
 * every frame would flare the pack a dozen times an item. `Player.tsx` keys the
 * mount on the item they answered, which makes each of these run exactly once.
 *
 * **Nothing is written underneath it.** There was a line reading "1 more to
 * bank" and a count of what had been banked, and both were captions on a picture
 * that already says it: the cells are how close you are, and what you have
 * banked is the number in the panel directly below. A sentence under a thumb is
 * a thing to read in the eight seconds somebody has to answer.
 */

interface StreakBatteryProps {
  /** `state.streak` — cells charged, `0` to `streakLength - 1`. */
  streak: number;
  /** `state.streakLength` — how many cells the pack has. Config, 2 to 6. */
  streakLength: number;
  /** `state.last` — what the item they just answered did to it. */
  last: Match3Beat | null;
  /** Whether `last` is theirs to play. False until they have answered this item. */
  beat: boolean;
}

export function StreakBattery({ streak, streakLength, last, beat }: StreakBatteryProps) {
  const playing = beat && last ? last : null;

  return (
    <div className={`streak-battery${playing ? ` streak-battery--${playing}` : ''}`}>
      <div
        className="streak-battery__pack"
        style={{ '--cells': streakLength } as CSSProperties}
        role="img"
        aria-label={`${streak} of ${streakLength} charged`}
      >
        <span className="streak-battery__cells">
          {Array.from({ length: streakLength }, (_, index) => (
            <i
              key={index}
              className={
                'streak-battery__cell' +
                (index < streak ? ' streak-battery__cell--charged' : '') +
                // The cell that just filled. Marked here because "the last
                // element with this class" is not something CSS can select.
                (index === streak - 1 ? ' streak-battery__cell--fresh' : '')
              }
              style={{ '--i': index } as CSSProperties}
            />
          ))}
        </span>
        {/* The terminal. Purely so the shape reads as a cell and not as a
            progress bar — a progress bar implies it will get there on its own. */}
        <span className="streak-battery__nub" aria-hidden="true" />
      </div>
    </div>
  );
}
