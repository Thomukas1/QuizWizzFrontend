import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { Bubbles } from '../../primitives/Bubbles';
import type { PublicPlayer } from '../../services/quizwizz';

/**
 * **Who got it** — the roll call after a reveal, one face at a time.
 *
 * It replaced a bar chart of how the room split and a grid of everyone's tile
 * lighting up as they answered. Both were information; neither was a moment.
 * A row that fills up one person at a time is the same fact delivered as a
 * result, and it is the only thing on the screen doing anything while the host
 * reads the explanation out.
 *
 * **The order is the server's, and it means something.** `scorers` is
 * `correctIds`, which is arrival order among the correct answers — so the row
 * fills in the order people actually got there, and the first face to appear
 * was the first one in. Nothing here sorts it.
 *
 * **An empty row is not an empty state.** A whole room missing a warmup
 * question is the best thing that happens all night, so it is announced rather
 * than skipped past — see the branch at the bottom.
 */

/** Between pops. Slow enough to land as separate events rather than a shuffle. */
const POP_INTERVAL_MS = 300;

/**
 * How far past the right edge the newest face sits before the rail travels.
 *
 * Zero would park each arrival flush against the frame, which reads as a face
 * that only half arrived. The rail overshoots by this much so the newest tile
 * lands with air beside it — the travel is what is visible, not the clipping.
 */
const TRAIL_PX = 24;

interface ScorerRollProps {
  /** The roster, to put a name and a face to an id. */
  players: PublicPlayer[];
  /** `reveal.scorers` — ids, in the order they answered. */
  scorers: string[];
  /**
   * What the row is a row *of*.
   *
   * Copy, and copy belongs to the client — but it belongs to the **format**
   * rather than to the kit, because what these faces have in common is not the
   * same fact in every round. In the warmup they knew the answer; in Popularity
   * there was no answer and they read the room. One word of difference, and a
   * default so the format that doesn't care says nothing.
   */
  header?: string;
  /** What an empty row announces. The absence is usually the funnier result. */
  nobody?: string;
}

export function ScorerRoll({
  players,
  scorers,
  header = 'Answered correctly:',
  nobody = 'Nobody got it right',
}: ScorerRollProps) {
  const roster = useMemo(() => new Map(players.map(player => [player.id, player])), [players]);

  /**
   * Identity, not the array.
   *
   * A frame push during the reveal — somebody's phone dropping is enough —
   * hands this a brand new array with exactly the same ids in it. Keyed on the
   * array itself, the roll would start again from the first face every time
   * that happened, which is both wrong and very visible.
   */
  const rollKey = scorers.join(',');
  const count = scorers.length;

  const [shown, setShown] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShown(0);
    if (count === 0) return;

    // Somebody who asked for less motion did not ask to be kept waiting three
    // seconds to find out who won the question.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(count);
      return;
    }

    const id = setInterval(() => {
      setShown(n => {
        if (n + 1 >= count) clearInterval(id);
        return Math.min(n + 1, count);
      });
    }, POP_INTERVAL_MS);

    return () => clearInterval(id);
  }, [rollKey, count]);

  /**
   * Follow the newest face. Fifteen people do not fit across a television, and
   * the ones pushed off the left are the ones who got there first — so the row
   * travels rather than truncating, and nobody's moment happens off-screen.
   *
   * **It moves the rail, it does not scroll.** A `scrollTo({behavior:'smooth'})`
   * every 300ms is a smooth scroll interrupted and re-aimed before any of them
   * ever arrives: the browser restarts the animation from wherever it got to,
   * the target has meanwhile moved another tile right, and the row settles into
   * a permanent lag of about one face — the newest arrival parked half off the
   * edge, for the whole roll. A transform with a transition shorter than the
   * interval lands every time, and is the only kind of motion this app spends
   * on a screen the whole room is watching.
   */
  useLayoutEffect(() => {
    const frame = viewport.current;
    const strip = rail.current;
    if (!frame || !strip) return;

    // Layout width of the faces; the pop animation scales them, and a transform
    // does not change what this measures.
    const overflow = strip.scrollWidth + TRAIL_PX - frame.clientWidth;
    const shift = Math.max(0, overflow);
    strip.style.transform = `translateX(${-shift}px)`;
    // The left-edge fade belongs to a row that has travelled; an unshifted one
    // starts at the edge and its first face must not arrive half-dissolved.
    frame.classList.toggle('scorer-roll__track--travelled', shift > 0);
  }, [shown, rollKey]);

  return (
    <div className={`scorer-roll${count === 0 ? ' scorer-roll--empty' : ''}`}>
      {/* Only when there is something to celebrate. A bubble field rising
          gently behind "nobody got it right" would be the screen laughing at
          its own joke. */}
      {count > 0 && <Bubbles />}

      <span className="scorer-roll__header">{header}</span>

      {count === 0 ? (
        /*
          **Nobody.** The format's own notes say to reveal and move on without
          commenting on it, and that is right for a quiet failure — but a whole
          room missing one is not a quiet failure, it is the best thing that
          happens all evening. So it gets said out loud, in the colour that
          means something went wrong, and the joke is that nothing did.
        */
        <p className="scorer-roll__nobody">{nobody}</p>
      ) : (
        /* Two elements, one job: a fixed frame the size of the box, and a rail
           of faces inside it that slides left as it outgrows the frame. */
        <div className="scorer-roll__track" ref={viewport}>
          <div className="scorer-roll__rail" ref={rail}>
            {scorers.slice(0, shown).map(id => {
              const player = roster.get(id);
              // A scorer the roster no longer has — they quit between answering
              // and the reveal. They earned it, so the tile keeps its place in
              // the row; only the name is gone.
              return (
                <div key={id} className="scorer-roll__tile">
                  {player ? (
                    <Avatar avatar={player.avatar} size={56} seed={player.id} offline={!player.connected} />
                  ) : (
                    <div className="scorer-roll__ghost" aria-hidden="true" />
                  )}
                  <span className="scorer-roll__name">{player?.name ?? 'Gone'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
