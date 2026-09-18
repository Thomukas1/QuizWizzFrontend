import { useEffect, useRef, useState } from 'react';
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
 * **The loop is a carousel, not a rewind.** The list is rendered twice when it
 * overflows and the scroll wraps by exactly one copy, so the seam is invisible
 * and first place is on screen for the same stretch as everybody else. Rewinding
 * to the top instead gave the leader a fraction of a second per lap — they were
 * the row the rewind landed on and immediately scrolled away from.
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
  /** First row of the second copy. The distance to it *is* the loop length. */
  const loopStart = useRef<HTMLLIElement>(null);
  /**
   * Whether the second copy is in the DOM. Measured, not guessed: a list that
   * fits must never be doubled, or four players would read as eight.
   */
  const [looping, setLooping] = useState(false);
  /**
   * Bumped whenever the panel's own height changes — the host goes fullscreen
   * mid-game and every height measured below was measured against the old
   * viewport. The measuring is done once per arming rather than once per frame,
   * so something has to say when it is stale.
   */
  const [resized, setResized] = useState(0);

  useEffect(() => {
    const element = scroller.current;
    if (!element || !autoScroll) return;
    const observer = new ResizeObserver(() => setResized(n => n + 1));
    observer.observe(element);
    return () => observer.disconnect();
  }, [autoScroll]);

  useEffect(() => {
    // Someone who asked for less motion did not ask for a list that reads itself.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!autoScroll || still) {
      setLooping(false);
      return;
    }
    const element = scroller.current;
    if (!element) return;

    const viewport = element.clientHeight;

    // Not doubled yet, so `scrollHeight` is the honest height of one copy.
    // Doubling re-runs this effect, which then falls through to the animation.
    if (!looping) {
      if (element.scrollHeight > viewport + 1) setLooping(true);
      else element.scrollTop = 0;
      return;
    }

    const first = element.firstElementChild as HTMLElement | null;
    const second = loopStart.current;
    if (!first || !second) return;

    // Top of copy one to top of copy two: the rows, the break line, and the
    // gaps around it. Advance by exactly this and the pixels under the fold
    // are the pixels that were there a lap ago.
    const loopLength = second.offsetTop - first.offsetTop;
    // The gap is the one part of that distance the DOM won't hand us as an
    // element, and it is needed to get back to the height of a single copy.
    const gap = parseFloat(getComputedStyle(element).rowGap) || 0;

    // A copy shorter than the viewport can't be scrolled by a whole lap — the
    // browser would clamp at the bottom and the wrap would jerk. Players left;
    // stop looping and let it sit still.
    if (loopLength - gap <= viewport) {
      setLooping(false);
      return;
    }

    // Driven by elapsed time rather than per-frame increments, so the speed is
    // the same on a 60Hz projector and a 144Hz laptop panel.
    let position = element.scrollTop % loopLength;
    let previous = 0;
    let frame = 0;

    const step = (now: number) => {
      if (previous) {
        position = (position + (SCROLL_SPEED * (now - previous)) / 1000) % loopLength;
        // No rewind, no easing: the wrap is a modulo onto identical pixels, so
        // there is nothing to animate and nothing that reads as the standings
        // changing — which is the one thing this must never say.
        element.scrollTop = position;
      }
      previous = now;
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // Re-armed when the list changes length or the panel changes size: every
    // height it measured just moved.
  }, [autoScroll, looping, rows.length, resized]);

  const renderRow = (player: PublicPlayer, copy: number, index: number) => {
    const moved = movement ? movementOf(player) : null;
    return (
      <li
        // The second copy is the same players again, so the key has to say
        // which lap it belongs to.
        key={`${copy}:${player.id}`}
        ref={copy === 1 && index === 0 ? loopStart : undefined}
        aria-hidden={copy === 1 ? true : undefined}
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
  };

  /**
   * The seam, drawn. Without it the loop is a lie — the list would read as an
   * endless roster with the same names in it twice. With it, the wrap says
   * "that was everybody, here is first place again".
   */
  const breakLine = (copy: number) => (
    <li key={`${copy}:wrap`} className="leaderboard__wrap" aria-hidden="true" />
  );

  return (
    <ol
      ref={scroller}
      className={`leaderboard leaderboard--${size}${looping ? ' leaderboard--looping' : ''}`}
    >
      {rows.map((player, index) => renderRow(player, 0, index))}
      {/* One copy when it fits, two when it doesn't. The second is the same
          rows again and exists only to be scrolled onto — it is hidden from
          assistive tech, which reads the list rather than watching it. */}
      {looping && [
        breakLine(0),
        ...rows.map((player, index) => renderRow(player, 1, index)),
        breakLine(1),
      ]}
    </ol>
  );
}
