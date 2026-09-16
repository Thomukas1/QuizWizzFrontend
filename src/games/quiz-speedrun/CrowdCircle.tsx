import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Avatar } from '../../components/Avatar';
import type { PublicPlayer } from '../../services/quizwizz';
import type { SpeedrunPlace } from './view';
import { ordinal, seconds } from './format';

/**
 * **The pool, and then the cull.** Everyone who got it right, stood in a ring —
 * and the format's whole reveal happening inside it.
 *
 * It replaces the warmup's `<ScorerRoll>` for exactly one reason: in the warmup
 * being right is the result, so a row of faces filling up *is* the payoff. Here
 * being right is only the entry fee. Nine people in a ring with three points
 * between them is a picture of the question the format actually asks, and a row
 * that scrolls sideways cannot ask it.
 *
 * ## The three beats
 *
 * 1. **`crowd`** — everyone lands at once, evenly spaced, all the same. Nobody
 *    knows who is in the money. This beat is the format; the server holds it for
 *    the host precisely so the room gets to sit in it.
 * 2. **the cull** — the moment the host leaves the crowd step, the people who
 *    were right and too slow are destroyed one at a time, **slowest first**, a
 *    long beat apart. The ring closes in on the winners from the outside.
 * 3. **the money** — the survivors light up with their place, their time and
 *    their `+1`.
 *
 * ## Who is doomed, and how this is not the client scoring
 *
 * `crowd` is the server's `correctIds`, **ordered by arrival** — index 0 is the
 * fastest and the last element is the slowest. `winners` is on the frame from
 * the first reveal step. So everyone past `winners` in that list is out, and
 * reading it off the array is ordering something the server already ordered, not
 * deciding anything.
 *
 * **Points are a different matter and are never inferred.** A face lights up
 * only when the server has put that player in `reveal.podium`; the cull is a
 * picture of who is left, and the `+1` is the wire's word. A television that
 * worked out the payouts itself would be a television that can be wrong in front
 * of the room, and it would spoil the phones a step early.
 *
 * ## The two clocks
 *
 * The cull runs on a local interval and the podium runs on the host's key. They
 * would otherwise disagree — press through three places in two seconds and the
 * winners would be lit while the losers were still standing. So **nothing lights
 * up until the cull is finished**, and every place the frame has already handed
 * over lands together the moment it is. Hold on each step and the places light
 * one at a time, which is the format played properly; run through them and they
 * arrive at once, which is the format played fast. Neither is wrong and neither
 * can show a contradiction.
 */

/** Between explosions. Long, on purpose — each one is meant to land on its own. */
const CULL_INTERVAL_MS = 3000;

/** How big a face is, by how many are in the ring. A ring of forty is small faces. */
const seatSize = (count: number): number =>
  count <= 6 ? 104 : count <= 10 ? 84 : count <= 16 ? 66 : count <= 26 ? 52 : 40;

interface CrowdCircleProps {
  /** The roster, to put a name and a face to an id. */
  players: PublicPlayer[];
  /** `reveal.crowd` — correct ids, fastest first. `[]` is nobody; null never reaches here. */
  crowd: string[];
  /** `reveal.winners` — how many places pay. On the frame from the first reveal step. */
  winners: number;
  /** `reveal.podium` — the places unveiled so far, worst first. */
  podium: SpeedrunPlace[];
  /** `reveal.place` — the place going up now, or null while the crowd still holds. */
  place: number | null;
}

export function CrowdCircle({ players, crowd, winners, podium, place }: CrowdCircleProps) {
  const roster = useMemo(() => new Map(players.map(player => [player.id, player])), [players]);

  /**
   * The doomed, **slowest first** — which is the order they are destroyed in.
   *
   * `crowd` is fastest-first, so this is its tail, reversed. Shorter than
   * `winners` means everybody who was right is in the money and there is nothing
   * to cull, which is the four-people-right case and the one-person-right case
   * both.
   */
  const doomed = useMemo(() => crowd.slice(winners).reverse(), [crowd, winners]);

  const [destroyed, setDestroyed] = useState(0);

  /**
   * Identity, not the array. A frame push during the reveal — somebody's phone
   * dropping is enough — hands this the same ids in a new array, and keyed on
   * the array the cull would start over from the first explosion every time.
   */
  const crowdKey = crowd.join(',');

  // The podium has started. Until it does the ring just stands there, which is
  // the beat the whole format is built on.
  const culling = place !== null;

  useEffect(() => {
    setDestroyed(0);
  }, [crowdKey]);

  useEffect(() => {
    if (!culling || doomed.length === 0) return;

    // Somebody who asked for less motion did not ask to wait eighteen seconds to
    // find out who won the question.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDestroyed(doomed.length);
      return;
    }

    const id = setInterval(() => {
      setDestroyed(n => {
        if (n + 1 >= doomed.length) clearInterval(id);
        return Math.min(n + 1, doomed.length);
      });
    }, CULL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [culling, doomed.length, crowdKey]);

  /**
   * **The frame is past the first place, so the cull is over.**
   *
   * Two ways to get here and both need the same answer. The host presses through
   * the podium faster than a cull that is deliberately slow — three seconds a
   * head, and a room that has already seen the joke does not need eighteen of
   * them. Or the television reconnects onto a podium step, and replaying the
   * explosions for a place the room watched go up two minutes ago is worse than
   * not showing them at all.
   *
   * `podium.length > 1` is the test because it is the frame's own word: the
   * first podium step carries exactly one place, so more than one means the
   * unveiling has moved on. A step count kept locally would be the client
   * re-deriving something the payload already says.
   */
  useEffect(() => {
    if (podium.length > 1) setDestroyed(doomed.length);
  }, [podium.length, doomed.length]);

  /** How far through the cull we are. Nothing pays out until this is false. */
  const purging = culling && destroyed < doomed.length;

  /** Where each doomed player sits in the queue, so a tile knows if it is gone. */
  const cullIndex = useMemo(
    () => new Map(doomed.map((id, index) => [id, index])),
    [doomed],
  );

  const paid = useMemo(
    () => new Map(podium.map(row => [row.playerId, row])),
    [podium],
  );

  if (crowd.length === 0) {
    return (
      <div className="crowd-circle crowd-circle--empty">
        {/* The format's own notes say this is a good moment — don't fight it.
            A whole room missing one is the best thing that happens all night. */}
        <p className="crowd-circle__nobody">Nobody got it right</p>
      </div>
    );
  }

  const seat = seatSize(crowd.length);

  return (
    <div
      className="crowd-circle"
      style={{ '--seat': `${seat}px`, '--n': crowd.length } as CSSProperties}
    >
      {/* The middle carries whatever the ring is currently saying: how many were
          right while they all still stand, and the place going up once they
          don't. It is deliberately quiet during the cull — the explosions are
          the thing to watch, and a number changing under them competes. */}
      <div className="crowd-circle__centre" aria-live="polite">
        {!culling ? (
          <>
            <span className="crowd-circle__tally">{crowd.length}</span>
            <span className="crowd-circle__tally-label">got it right</span>
          </>
        ) : purging ? (
          <span className="crowd-circle__tally-label">…</span>
        ) : (
          <span className="crowd-circle__place-up">{ordinal(place)}</span>
        )}
      </div>

      {crowd.map((id, index) => {
        const player = roster.get(id);
        const queued = cullIndex.get(id);
        const gone = queued !== undefined && queued < destroyed;
        // The wire's word, and only once the cull has finished arguing with it.
        const won = purging ? undefined : paid.get(id);

        return (
          <div
            key={id}
            className={
              'crowd-circle__seat' +
              (gone ? ' crowd-circle__seat--gone' : '') +
              (won ? ' crowd-circle__seat--won' : '')
            }
            style={{ '--i': index } as CSSProperties}
          >
            {/* The shards. Purely decorative, mounted for every seat so that a
                tile which explodes does not have to re-render into a different
                subtree mid-animation. They are invisible until `--gone`. */}
            <span className="crowd-circle__burst" aria-hidden="true">
              <i /><i /><i /><i /><i /><i />
            </span>

            <span className="crowd-circle__face">
              {player ? (
                <Avatar avatar={player.avatar} size={seat} seed={player.id} />
              ) : (
                <span className="crowd-circle__ghost" aria-hidden="true" />
              )}

              {/* Upper right, the way a payout lands in every game that has
                  ever paid one out. Only on a place the server has unveiled. */}
              {won && <span className="crowd-circle__points">+{won.points}</span>}
            </span>

            <span className="crowd-circle__name">{player?.name ?? 'Gone'}</span>

            {/* The times are the payoff. A place with no number beside it is
                just a name, and the whole point is being able to see how close
                fourth was. */}
            {won && (
              <span className="crowd-circle__result">
                <span className="crowd-circle__rank">{ordinal(won.place)}</span>
                <span className="crowd-circle__time">{seconds(won.elapsedMs)}</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
