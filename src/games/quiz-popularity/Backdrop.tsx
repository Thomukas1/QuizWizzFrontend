import { useMemo } from 'react';
import type { CSSProperties } from 'react';

/**
 * **Popularity's sky.** Fruit, at about a tenth strength.
 *
 * The most colourful background in the set and the quietest one, which sounds
 * like a contradiction and is the entire brief: every hue in the palette is in
 * here, and not one of them is above 13% alpha. Colour spread thin reads as a
 * mood; the same colour concentrated reads as a thing on the screen, and this
 * screen already has four things on it.
 *
 * ## Why this format in particular cannot afford a loud background
 *
 * Popularity is the one round that **tints its own interface**. `phase` swings
 * the whole display between lime (the honest question) and amber (the guess),
 * and that swing is load-bearing — it is how a room notices it is being asked a
 * different question with the same four answers. A backdrop with any real
 * saturation in it would be a third colour arguing with those two, and the format
 * quietly becomes a slower warmup with no scoring.
 *
 * So the shapes are wallpaper. Every one of them is below the threshold where
 * you would point at it, and the sum is a warm multi-hue field that the chart's
 * blue bars and the crowned lime one sit on top of without competing.
 *
 * ## Soft where it can be, hard where it costs nothing
 *
 * Discs are a radial gradient fading to transparent — a soft-edged blob with no
 * `filter: blur()` anywhere near it, which is the difference between fifteen
 * cheap composited layers and fifteen expensive ones. The angular kinds keep a
 * hard edge, which at this alpha is barely an edge at all and is what stops the
 * field reading as nothing but bubbles.
 *
 * Two elements per shape: the outer drifts, the inner turns or breathes on an
 * unrelated period. Discs breathe rather than turn — spinning a radial gradient
 * about its own centre is compositor work with nothing to show for it.
 */

const SHAPES = 15;

/**
 * The fruit. Channel triplets so the alpha can be per-shape, which is what keeps
 * the field from banding into six flat colours. Steel is the one that isn't
 * fruit — a cool note in a bowl of sugar, so the whole thing doesn't go syrup.
 */
const FRUITS = [
  '232, 52, 74', // p-error   — raspberry
  '245, 166, 35', // p-warning — apricot
  '182, 248, 51', // p-lime    — kiwi
  '193, 212, 156', // p-sage    — pistachio
  '17, 60, 178', // p-blue    — blueberry
  '119, 147, 158', // p-steel   — the cool note
];

/** Mostly soft blobs, with enough angular ones to be *shapes* rather than spots. */
const KINDS = ['disc', 'squircle', 'disc', 'pill', 'tri', 'disc', 'squircle', 'disc'] as const;

export default function PopularityBackdrop() {
  const shapes = useMemo(
    () =>
      Array.from({ length: SHAPES }, (_, index) => {
        const kind = KINDS[index % KINDS.length];
        // Discs fade to nothing at their own edge, so they need more alpha at the
        // centre to end up as visible as a flat shape of the same size.
        const alpha = kind === 'disc' ? 0.1 + Math.random() * 0.06 : 0.05 + Math.random() * 0.045;
        const width = 12 + Math.random() * 26;

        return {
          key: index,
          kind,
          style: {
            // Spilling past every edge on purpose — a shape wholly inside the
            // zone is an object, and one running off the side is a field.
            left: `${-12 + Math.random() * 110}%`,
            top: `${-14 + Math.random() * 112}%`,
            '--tint': FRUITS[index % FRUITS.length],
            '--alpha': String(alpha),
            '--w': `${width}vw`,
            '--h': kind === 'pill' ? `${width * (0.16 + Math.random() * 0.14)}vw` : `${width * (0.72 + Math.random() * 0.5)}vw`,
            '--dx': `${(Math.random() * 2 - 1) * 9}vw`,
            '--dy': `${(Math.random() * 2 - 1) * 7}vh`,
            '--rot': `${Math.random() * 360}deg`,
            // Very slow. Anything a room can watch travel is a distraction, and
            // the point of the drift is only that the field is never quite the
            // same shape twice across a ninety-second round.
            '--float': `${34000 + Math.random() * 30000}ms`,
            '--spin': `${70000 + Math.random() * 80000}ms`,
            animationDelay: `${-Math.random() * 40000}ms`,
          } as CSSProperties,
        };
      }),
    [],
  );

  return (
    <div className="game-backdrop game-backdrop--popularity" aria-hidden="true">
      <div className="pop-shapes">
        {shapes.map(shape => (
          <span key={shape.key} className={`pop-shape pop-shape--${shape.kind}`} style={shape.style}>
            <i />
          </span>
        ))}
      </div>
    </div>
  );
}
