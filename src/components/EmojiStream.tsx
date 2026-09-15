import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * Reactions floating up the screen.
 *
 * One component for both surfaces, because they are the same thing seen from
 * two sides: the phone spawns from its own taps for immediate feedback, the
 * television spawns from `react:burst` so the room sees what it did. Feeding it
 * one shape keeps the motion identical in both places, which is what makes the
 * connection between the two screens legible.
 *
 * **`feed` is a sequence, not a list.** The caller bumps `seq` to say "these
 * just happened"; the same emoji arriving twice in a row is the common case
 * (eight people mashing 🔥), and a value-compared effect would swallow the
 * second one. Only the seq is watched.
 */

/** Concurrent particles. Past this the oldest are dropped — nobody can read 200. */
const MAX_PARTICLES = 60;

/** Rise time, randomised per particle so a burst doesn't move as one block. */
const RISE_MS = { min: 3000, max: 4200 };

interface Particle {
  id: number;
  emoji: string;
  style: CSSProperties;
  /** When it may be swept. Kept on the particle so one timer can retire many. */
  expiresAt: number;
}

export interface EmojiFeed {
  seq: number;
  emojis: string[];
}

let nextId = 0;

function makeParticle(emoji: string, now: number): Particle {
  const rise = RISE_MS.min + Math.random() * (RISE_MS.max - RISE_MS.min);
  return {
    id: nextId++,
    emoji,
    expiresAt: now + rise,
    style: {
      // Spawn point, never animated. Inset from the edges so a particle can sway
      // without clipping against the side of its container.
      left: `${8 + Math.random() * 84}%`,
      '--rise': `${Math.round(rise)}ms`,
      // A slow sway reads as drifting; a fast one reads as jitter. The range is
      // narrow on purpose.
      '--sway': `${900 + Math.random() * 800}ms`,
      '--sway-x': `${6 + Math.random() * 14}px`,
      '--sway-r': `${4 + Math.random() * 10}deg`,
      // A burst arrives in one frame; fanning the starts out over ~400ms turns
      // a wall of emoji into a stream of them.
      animationDelay: `${Math.round(Math.random() * 400)}ms`,
    } as CSSProperties,
  };
}

interface EmojiStreamProps {
  feed: EmojiFeed | null;
  /** `zone` fills the host's game zone; `overlay` sits inside the phone's phase row. */
  variant: 'zone' | 'overlay';
}

export function EmojiStream({ feed, variant }: EmojiStreamProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const lastSeq = useRef(-1);

  useEffect(() => {
    if (!feed || feed.seq === lastSeq.current) return;
    lastSeq.current = feed.seq;
    if (feed.emojis.length === 0) return;

    // A burst can carry a dozen items. One state update for the whole batch, not
    // one per item — twelve renders in a frame is how this drops frames at the
    // moment everyone is watching.
    const now = Date.now();
    setParticles(current => {
      const next = [...current, ...feed.emojis.map(emoji => makeParticle(emoji, now))];
      return next.length > MAX_PARTICLES ? next.slice(next.length - MAX_PARTICLES) : next;
    });
  }, [feed]);

  // One sweep for everything on screen, rather than a timer per particle. At a
  // burst every 100ms the per-particle version leaves hundreds of timers
  // outstanding, and every one of them holds a closure over stale state.
  // Armed by emptiness, not by the count, so a steady stream doesn't tear the
  // interval down and rebuild it on every single spawn.
  const idle = particles.length === 0;
  useEffect(() => {
    if (idle) return;
    const id = setInterval(() => {
      const now = Date.now();
      setParticles(current => {
        const live = current.filter(p => p.expiresAt > now);
        return live.length === current.length ? current : live;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [idle]);

  return (
    <div className={`emoji-stream emoji-stream--${variant}`} aria-hidden="true">
      {particles.map(particle => (
        <div key={particle.id} className="emoji-stream__particle" style={particle.style}>
          <span className="emoji-stream__glyph">{particle.emoji}</span>
        </div>
      ))}
    </div>
  );
}
