import { useMemo } from 'react';
import type { CSSProperties } from 'react';

/**
 * **Match-3's sky.** A charged amber field with lightning going through it.
 *
 * Twenty items and ten seconds on each — the format is the one that pushes
 * hardest, and this is the only part of the screen allowed to say so. The display
 * itself deliberately holds still while a question is live (the only thing that
 * changes is the prompt in the middle), so the energy had nowhere else to go.
 *
 * It keeps running through the `hold`, unchanged and unaware of it. The five
 * seconds with the answer up are a pause in the game, not a pause in the room —
 * the sky going calm for them would read as the round having ended.
 *
 * ## Amber, and why the middle is the calm part
 *
 * The charge is thrown from the two top corners and up from the bottom edge,
 * which leaves a quieter band across the centre — where the prompt and the two
 * option cards live, and where a room reading at three metres in ten-second
 * bursts cannot afford to be fighting a background. Bright rim, legible middle.
 *
 * Amber rather than lime, and not because lime is the wrong yellow: Match-3's own
 * screen is *already* lime — the option keys, the streak battery, every chip
 * `<BankBurst>` throws. A lime field would swallow the one colour this format
 * uses to say you scored.
 *
 * ## The strikes
 *
 * Six bolts, each a jagged polyline with one fork, each on its own unrelated
 * period with a negative delay — so they never sync and never repeat in a
 * pattern a room could learn. The geometry is generated once at mount; only
 * `opacity` animates, on the wrapper, so a strike costs one composited layer
 * rather than a repaint of six paths.
 *
 * Three strokes per path, widest and dimmest first: a blue halo, a pale middle,
 * a white core. That stack is the whole of why it reads as lightning and not as
 * a zigzag — the colour is in the spill and the brightness is in the centre.
 */

const BOLTS = 6;

/**
 * A bolt, as a main path and a fork off one of its joints. Percentages in a
 * 0–100 box: the SVG stretches to whatever slot the bolt is given, and the
 * strokes are `non-scaling-stroke` so they stay the same weight however it is
 * stretched.
 */
function boltGeometry() {
  const segments = 5 + Math.floor(Math.random() * 3);

  const points: Array<[number, number]> = [[40 + Math.random() * 20, 0]];
  for (let i = 1; i <= segments; i++) {
    const previous = points[i - 1][0];
    // Clamped well inside the box: a bolt that runs off its own slot is a bolt
    // with a flat vertical edge, which reads as a crack in the screen.
    const x = Math.min(92, Math.max(8, previous + (Math.random() * 2 - 1) * 38));
    points.push([x, (i / segments) * 100]);
  }

  const main = points
    .map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');

  // Off a middle joint, two short segments, committed to one side. A fork that
  // wanders back across the main path looks like a drawing of lightning.
  const joint = 1 + Math.floor(Math.random() * (segments - 1));
  const [jx, jy] = points[joint];
  const side = Math.random() < 0.5 ? -1 : 1;
  const bend = Math.min(96, Math.max(4, jx + side * (14 + Math.random() * 14)));
  const tip = Math.min(96, Math.max(4, bend + side * (8 + Math.random() * 16)));
  const run = 100 - jy;
  const fork =
    `M ${jx.toFixed(1)} ${jy.toFixed(1)}` +
    ` L ${bend.toFixed(1)} ${(jy + run * 0.28).toFixed(1)}` +
    ` L ${tip.toFixed(1)} ${(jy + run * 0.55).toFixed(1)}`;

  return { main, fork };
}

export default function Match3Backdrop() {
  const bolts = useMemo(
    () =>
      Array.from({ length: BOLTS }, (_, index) => ({
        key: index,
        ...boltGeometry(),
        style: {
          left: `${4 + Math.random() * 78}%`,
          width: `${10 + Math.random() * 16}%`,
          // Most of them stop short of the bottom. A field of bolts that all
          // reach the floor reads as a fence.
          height: `${45 + Math.random() * 55}%`,
          // Unrelated periods, so six bolts never land together twice. The strike
          // itself is ~3.5% of the cycle — a quarter-second of light in anything
          // from six to thirteen seconds of dark.
          '--dur': `${6000 + Math.random() * 7000}ms`,
          animationDelay: `${-Math.random() * 13000}ms`,
        } as CSSProperties,
      })),
    [],
  );

  return (
    <div className="game-backdrop game-backdrop--match3" aria-hidden="true">
      <div className="match3-bolts">
        {bolts.map(bolt => (
          <span key={bolt.key} className="match3-bolt" style={bolt.style}>
            {/* `preserveAspectRatio="none"` so the box is the bolt's slot rather
                than the bolt's aspect — a tall narrow strike and a short wide one
                come out of the same geometry. */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              <path className="match3-bolt__halo" d={bolt.main} />
              <path className="match3-bolt__halo" d={bolt.fork} />
              <path className="match3-bolt__spill" d={bolt.main} />
              <path className="match3-bolt__spill" d={bolt.fork} />
              <path className="match3-bolt__core" d={bolt.main} />
              <path className="match3-bolt__core" d={bolt.fork} />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}
