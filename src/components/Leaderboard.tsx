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
 * **Three columns: place, face, and everything else.** The row was five columns
 * wide — rank, avatar, name, movement, score — and on the host that is a fifth
 * of a television, where four of those five were fixed-width and the name got
 * whatever was left, which was about four characters. Rank and its movement
 * arrow are one stacked cell now, bought for the name: it is the only cell whose
 * content the server doesn't control the width of.
 *
 * The score's *position* inside the third cell is the one thing the two sizes
 * disagree about, and it is settled in CSS rather than here — right of the name
 * on the phone, which has the width for it, under the name on the host, which
 * doesn't. One markup, two rules; see `styles/components/leaderboard.css`.
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
    <ol ref={scroller} className={`leaderboard leaderboard--${size}`}>
      {rows.map(player => {
        const moved = movement ? movementOf(player) : null;
        return (
          <li
            key={player.id}
            className={`leaderboard__row${
              medals && player.rank <= 3 ? ` leaderboard__row--medal-${player.rank}` : ''
            }`}
          >
            {/* Rank and its movement are one cell, stacked. They are the same
                fact stated twice — where you are, and how you got there — and
                side by side they were two reserved gutters at opposite ends of
                a row that had none to spare. The arrow is rendered for every
                row or for none, never per-row: one that showed up only on the
                players who moved would make their rows a line taller. */}
            <span className="leaderboard__place">
              <span className="leaderboard__rank">{player.rank}</span>
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
            </span>

            <Avatar
              avatar={player.avatar}
              size={size === 'lg' ? 44 : 36}
              seed={player.id}
              offline={!player.connected}
            />

            {/* Name and score, in one cell. Side by side on the phone, stacked
                on the host — a `flex-direction` apart, and nothing here knows
                which it got. */}
            <span className="leaderboard__who">
              <span className="leaderboard__name">{player.name}</span>
              {/* The unit is a separate span so it can be sized and dimmed away
                  from the number — on a television the score is the thing being
                  read from three metres and "pts" is only there to say what it
                  is, not to compete with it. */}
              <span className="leaderboard__score">
                {player.score}
                <span className="leaderboard__unit">pts</span>
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
