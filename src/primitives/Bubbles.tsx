import { useMemo } from 'react';
import type { CSSProperties } from 'react';

/**
 * A slow field of rising bubbles, for filling a box that is celebrating
 * something. It knows nothing about what — hence a primitive.
 *
 * Two elements per bubble, the same trick the confetti and the emoji stream
 * use: the outer one rises at a constant rate, the inner one sways and breathes
 * on a different period. One element doing both makes the whole field move as a
 * single sheet, which reads as a screensaver rather than as water.
 *
 * Generated once and never re-rendered — the randomness is in the style objects
 * and the motion is entirely CSS, so this costs nothing per frame on the main
 * thread while the room is looking at it.
 */

/**
 * Enough to read as a field in a strip this size.
 *
 * Generous, because each one is barely visible: at this contrast a sparse field
 * reads as a few smudges rather than as movement, and the whole point is the
 * background being alive rather than anything in front of it.
 */
const COUNT = 22;

export function Bubbles() {
  const bubbles = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, index) => ({
        key: index,
        style: {
          left: `${Math.random() * 100}%`,
          // A wide spread, and big — a low-contrast patch has to be large
          // enough to register as a change in the field rather than as noise.
          // Uniform circles are a loading spinner.
          '--size': `${14 + Math.random() * 42}px`,
          '--rise': `${5200 + Math.random() * 5200}ms`,
          '--sway': `${1700 + Math.random() * 1500}ms`,
          '--drift': `${(Math.random() * 2 - 1) * 26}px`,
          // Negative, so the box arrives already full rather than starting
          // empty and filling from the bottom — the panel is only on screen for
          // a few seconds and the first of those is the one that matters.
          animationDelay: `${-Math.random() * 9000}ms`,
        } as CSSProperties,
      })),
    [],
  );

  return (
    <div className="bubbles" aria-hidden="true">
      {bubbles.map(bubble => (
        <span key={bubble.key} className="bubbles__bubble" style={bubble.style}>
          <span className="bubbles__skin" />
        </span>
      ))}
    </div>
  );
}
