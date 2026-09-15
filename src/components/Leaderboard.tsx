import { useEffect, useRef } from 'react';
import { Avatar } from './Avatar';
import type { RankedPlayer } from './standings';

/**
 * **The standings, one component, both screens.**
 *
 * The television and the phone show the same rows — the difference is which
 * slice, how big, and whether it reads itself. A TV is across the room and
 * nobody can scroll it, so it loop-scrolls; a phone is in your hand, so it
 * doesn't, because auto-scrolling something a thumb is already on is infuriating.
 * That is the whole of the divergence, and it is two props.
 *
 * Ordering lives in `standings.ts`, not here — this renders whatever slice it is
 * handed.
 */

/** How fast the TV reads itself, in pixels per second. Slow enough to actually read. */
const SCROLL_SPEED = 22;

interface LeaderboardProps {
  rows: RankedPlayer[];
  /** Loop-scroll when the rows overflow. For the TV, which nobody can reach. */
  autoScroll?: boolean;
  /** `lg` is three-metre sizing. */
  size?: 'sm' | 'lg';
  /**
   * Gold, silver and bronze on the top three.
   *
   * A prop rather than a fact of the rank, because the host's panel is on screen
   * from the moment the first phone joins — and in the lobby every score is zero,
   * so the order is join order. Medalling that would be a podium for a game
   * nobody has played.
   */
  medals?: boolean;
}

export function Leaderboard({
  rows,
  autoScroll = false,
  size = 'sm',
  medals = true,
}: LeaderboardProps) {
  const scroller = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!autoScroll) return;
    const element = scroller.current;
    if (!element) return;
    // Someone who asked for less motion did not ask for a list that reads itself.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Driven by elapsed time rather than per-frame increments, so the speed is
    // the same on a 60Hz projector and a 144Hz laptop panel.
    let position = element.scrollTop;
    let previous = 0;
    let frame = 0;

    const step = (now: number) => {
      const overflow = element.scrollHeight - element.clientHeight;
      if (previous && overflow > 1) {
        position += (SCROLL_SPEED * (now - previous)) / 1000;
        // Straight back to the top, no easing: a rewind animation would be read
        // as the standings changing, which is the one thing it must not say.
        if (position >= overflow) position = 0;
        element.scrollTop = position;
      } else if (overflow <= 1) {
        position = 0;
      }
      previous = now;
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // Re-armed when the list changes length: the overflow it was measuring
    // against just moved.
  }, [autoScroll, rows.length]);

  return (
    <ol ref={scroller} className={`leaderboard leaderboard--${size}`}>
      {rows.map(({ rank, player }) => (
        <li
          key={player.id}
          className={`leaderboard__row${medals && rank <= 3 ? ` leaderboard__row--medal-${rank}` : ''}`}
        >
          <span className="leaderboard__rank">{rank}</span>
          <Avatar
            avatar={player.avatar}
            size={size === 'lg' ? 48 : 36}
            seed={player.id}
            offline={!player.connected}
          />
          <span className="leaderboard__name">{player.name}</span>
          <span className="leaderboard__score">{player.score}</span>
        </li>
      ))}
    </ol>
  );
}
