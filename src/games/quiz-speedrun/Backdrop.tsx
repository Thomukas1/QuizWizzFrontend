import { useMemo } from 'react';
import type { CSSProperties } from 'react';

/**
 * **Speedrun's sky.** Deep space at warp, and the room is the thing moving.
 *
 * The format's whole argument is that being right stopped being enough, and it
 * has to make that felt before the first question rather than on the first
 * reveal. So the background does the arguing: streaks tearing out of the middle
 * of the screen and off both edges, accelerating as they go, on a field dark
 * enough that they are the only thing in it.
 *
 * ## Two things the geometry is doing
 *
 * **The angles are biased to the horizontal** — every streak leaves within ~60°
 * of straight out either side. That keeps the vertical band clear, which is
 * where the prompt sits at the top of the zone and the locked-in count at the
 * bottom, and it puts the motion out on the left and right where peripheral
 * vision picks it up without anybody looking away from the question.
 *
 * **The centre is lit and the corners are not** (the vignette in the
 * stylesheet), which draws a soft circle in the middle of the zone. That is for
 * `<CrowdCircle>`: the ring takes the whole screen on the reveal, and a round
 * pool of light under a round thing is most of why it reads from three metres.
 *
 * Streaks are `transform` and `opacity` only, generated once and never
 * re-rendered. The stars and the vignette are two pseudo-elements and cost a
 * single paint — a hundred star divs would cost a hundred.
 */

const STREAKS = 34;

/**
 * Cold and pale, with the occasional lime one. The accent is rationed here on
 * purpose — every thirteenth streak works out at two or three in the field,
 * which reads as sparks rather than as a colour the background has been given.
 */
const tintFor = (index: number) => {
  if (index % 13 === 0) return 'var(--accent)';
  if (index % 5 === 0) return 'rgba(193, 212, 156, 0.85)'; // p-sage
  if (index % 3 === 0) return 'rgba(119, 147, 158, 0.9)'; // p-steel
  return 'rgba(211, 214, 215, 0.95)'; // p-text
};

export default function SpeedrunBackdrop() {
  const streaks = useMemo(
    () =>
      Array.from({ length: STREAKS }, (_, index) => {
        // Left half or right half, then a spread within 62° of horizontal. An
        // even scatter round the full circle puts streaks straight through the
        // prompt, and the prompt is the thing that has to be read.
        const angle = (index % 2 === 0 ? 0 : 180) + (Math.random() * 2 - 1) * 62;

        return {
          key: index,
          style: {
            '--a': `${angle}deg`,
            '--tint': tintFor(index),
            '--len': `${5 + Math.random() * 11}vw`,
            '--thick': `${1.5 + Math.random() * 2}px`,
            // Where it is born, and how far out it gets before it is gone. The
            // near value clears the middle of the zone so a streak never starts
            // inside the ring; the far one overshoots the edge for most angles,
            // and the steepest few simply fade out in the dark, which is what
            // distance looks like anyway.
            '--near': `${5 + Math.random() * 7}vw`,
            '--far': `${46 + Math.random() * 26}vw`,
            '--peak': `${0.5 + Math.random() * 0.5}`,
            '--dur': `${900 + Math.random() * 1500}ms`,
            // Negative, so the field is already at speed on the rules card
            // rather than exploding outward the moment the round opens.
            animationDelay: `${-Math.random() * 2400}ms`,
          } as CSSProperties,
        };
      }),
    [],
  );

  return (
    <div className="game-backdrop game-backdrop--warp" aria-hidden="true">
      <div className="warp-streaks">
        {streaks.map(streak => (
          <i key={streak.key} className="warp-streak" style={streak.style} />
        ))}
      </div>
    </div>
  );
}
