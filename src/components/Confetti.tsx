import { useMemo } from 'react';
import type { CSSProperties } from 'react';

/**
 * Falling confetti. Host only, and only at the end.
 *
 * Two elements per piece, the same trick the emoji stream uses: the outer one
 * falls at a constant rate, the inner one sways and tumbles on a different
 * period. One element doing both makes ninety pieces move as one sheet.
 *
 * Generated once and never re-rendered — the randomness is in the style objects
 * and the motion is entirely CSS, so this costs nothing per frame on the main
 * thread while the room is looking at it.
 */

const PIECES = 90;

/** Palette tokens only. Confetti is the one place the whole range gets spent at once. */
const COLORS = [
  'var(--p-lime)',
  'var(--p-lime-2)',
  'var(--p-sage)',
  'var(--p-blue)',
  'var(--p-warning)',
  'var(--white)',
];

export function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, index) => ({
        key: index,
        style: {
          left: `${Math.random() * 100}%`,
          // Set on the falling box, applied to the tumbling flake inside it —
          // the colour has to be on the element that rotates, or the tumble is
          // invisible.
          '--color': COLORS[index % COLORS.length],
          // Slivers and near-squares in the same fall; uniform rectangles read
          // as a screensaver.
          '--w': `${6 + Math.random() * 8}px`,
          '--h': `${10 + Math.random() * 8}px`,
          '--fall': `${4200 + Math.random() * 3800}ms`,
          '--spin': `${700 + Math.random() * 900}ms`,
          '--drift': `${(Math.random() * 2 - 1) * 60}px`,
          // Negative, so the screen is already mid-fall on arrival rather than
          // starting empty and filling from the top.
          animationDelay: `${-Math.random() * 6000}ms`,
        } as CSSProperties,
      })),
    [],
  );

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map(piece => (
        <span key={piece.key} className="confetti__piece" style={piece.style}>
          <span className="confetti__flake" />
        </span>
      ))}
    </div>
  );
}
