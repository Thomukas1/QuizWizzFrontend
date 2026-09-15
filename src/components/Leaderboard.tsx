import { useEffect, useRef } from 'react';
import { Avatar } from './Avatar';
import { movementOf } from './standings';
import type { PublicPlayer } from '../services/quizwizz';

/**
 * **The standings, one component, both screens.**
 *
 * The television and the phone show the same rows — the difference is how big,
 * and whether it reads itself. A TV is across the room and nobody can scroll it,
 * so it loop-scrolls; a phone is in your hand, so it doesn't, because
 * auto-scrolling something a thumb is already on is infuriating. That is the
 * whole of the divergence.
 *
 * **It is on screen from the first join to the podium**, which is why there is
 * no scoreboard phase: a phase whose entire job was "now look at the standings"
 * was putting this same list on screen twice.
 *
 * Ordering lives in `standings.ts` and ranking lives on the server. This renders
 * whatever slice it is handed, in the order it is handed it.
 */

/** How fast the TV reads itself, in pixels per second. Slow enough to actually read. */
const SCROLL_SPEED = 22;

interface LeaderboardProps {
  rows: PublicPlayer[];
  /** Loop-scroll when the rows overflow. For the TV, which nobody can reach. */
  autoScroll?: boolean;
  /** `lg` is three-metre sizing. */
  size?: 'sm' | 'lg';
  /**
   * Gold, silver and bronze on the top three.
   *
   * A prop rather than a fact of the rank, because this panel is on screen from
   * the moment the first phone joins — and in the lobby every score is zero, so
   * the order is join order. Medalling that would be a podium for a game nobody
   * has played.
   */
  medals?: boolean;
  /**
   * The `▲2` arrows. On during and after `RESULTS`, where the movement is the
   * thing everyone is looking for; off in the lobby, where nobody has moved.
   */
  movement?: boolean;
}

export function Leaderboard({
  rows,
  autoScroll = false,
  size = 'sm',
  medals = true,
  movement = false,
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
    // The movement column is added to every row or to none, never per-row:
    // it is a column, and a cell that appears only on the players who moved
    // would slide their score out of line with everybody else's.
    <ol
      ref={scroller}
      className={`leaderboard leaderboard--${size}${movement ? ' leaderboard--moving' : ''}`}
    >
      {rows.map(player => {
        const moved = movement ? movementOf(player) : null;
        return (
          <li
            key={player.id}
            className={`leaderboard__row${
              medals && player.rank <= 3 ? ` leaderboard__row--medal-${player.rank}` : ''
            }`}
          >
            <span className="leaderboard__rank">{player.rank}</span>
            <Avatar
              avatar={player.avatar}
              size={size === 'lg' ? 48 : 36}
              seed={player.id}
              offline={!player.connected}
            />
            <span className="leaderboard__name">{player.name}</span>
            {movement && (
              <span
                className={`leaderboard__move${moved ? ` leaderboard__move--${moved.direction}` : ''}`}
                aria-label={moved ? `${moved.places} ${moved.direction}` : 'no change'}
              >
                {moved && (
                  <>
                    <span aria-hidden="true">{moved.direction === 'up' ? '▲' : '▼'}</span>
                    {moved.places}
                  </>
                )}
              </span>
            )}
            <span className="leaderboard__score">{player.score}</span>
          </li>
        );
      })}
    </ol>
  );
}
