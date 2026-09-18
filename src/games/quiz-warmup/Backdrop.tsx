import { useMemo } from 'react';
import type { CSSProperties } from 'react';

/**
 * **The warmup's sky.** Dawn, with dust falling through it.
 *
 * The round's job is to teach the rhythm, so its structure is the one that does
 * the least: a warm band along the top of the zone, a slow grid you only notice
 * if you look for it, and a handful of specks falling at a dozen different
 * speeds. Everything the format does after this — the cull, the barrage — gets
 * to feel like something happening because this one didn't.
 *
 * The colour is carrying it instead, and it is the one thing here that is not
 * restrained: the evening runs dawn → deep space, so the first round has to be
 * the one nobody mistakes for the lobby it just left. See the stylesheet for why
 * it is allowed to spend amber and coral, and for the two values that change the
 * climate if it turns out to be the wrong time of day.
 *
 * Two elements per mote, the same trick `<Confetti>` and the emoji stream use:
 * the outer one falls at a constant rate, the inner one sways on its own period.
 * One element doing both makes twenty specks move as a single sheet.
 *
 * Generated once and never re-rendered — the randomness is in the style objects
 * and the motion is entirely CSS, so this costs nothing per frame on the main
 * thread while the room is reading a question.
 */

const MOTES = 20;

/**
 * Two pale and one warm, in that ratio on purpose. The sky is the thing that got
 * the colour; the dust stays washed out, and every third speck catching the light
 * is what ties it to the horizon behind it without the field turning amber.
 *
 * No lime in here at any strength — it is spent on the correct answer, three
 * inches away, and a background that borrows it makes that moment cheaper.
 */
const TINTS = [
  'rgba(211, 214, 215, 0.55)', // p-text
  'rgba(245, 166, 35, 0.40)', // p-warning — lit by the sun above it
  'rgba(119, 147, 158, 0.55)', // p-steel
];

export default function WarmupBackdrop() {
  const motes = useMemo(
    () =>
      Array.from({ length: MOTES }, (_, index) => ({
        key: index,
        style: {
          left: `${Math.random() * 100}%`,
          // Set on the falling box and applied to the swaying speck inside it.
          '--tint': TINTS[index % TINTS.length],
          '--size': `${5 + Math.random() * 11}px`,
          // Slow. A mote crossing a television in four seconds is weather; in
          // fourteen it is dust, which is the one that lets a room ignore it.
          '--fall': `${13000 + Math.random() * 11000}ms`,
          '--sway': `${2600 + Math.random() * 2600}ms`,
          '--drift': `${(Math.random() * 2 - 1) * 90}px`,
          '--peak': `${0.35 + Math.random() * 0.4}`,
          // Negative, so the zone is already mid-fall when the round opens
          // rather than starting empty and filling from the top.
          animationDelay: `${-Math.random() * 16000}ms`,
        } as CSSProperties,
      })),
    [],
  );

  return (
    <div className="game-backdrop game-backdrop--warmup" aria-hidden="true">
      <div className="warmup-motes">
        {motes.map(mote => (
          <span key={mote.key} className="warmup-mote" style={mote.style}>
            <i />
          </span>
        ))}
      </div>
    </div>
  );
}
