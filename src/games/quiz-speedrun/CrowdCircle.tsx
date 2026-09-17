import { useEffect, useMemo, useRef, useState } from 'react';
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
 * It owns the television on its own — no recap strip, no question above it. The
 * ring *is* the screen, because the thing the room is reading is faces from
 * three metres and anything beside them is competing with them.
 *
 * ## The three beats
 *
 * 1. **`crowd`** — the faces pop on one at a time, in scrambled seats, while the
 *    middle counts them. Nobody knows who is in the money. This beat is the
 *    format; the server holds it for the host precisely so the room gets to sit
 *    in it.
 * 2. **the cull** — the moment the host leaves the crowd step, the people who
 *    were right and too slow are destroyed one at a time, **slowest first**, a
 *    long beat apart. The ring closes in on the winners from the outside.
 * 3. **the money** — the survivors light up together with their place, their
 *    time and their `+1`.
 *
 * **Every place lands at once, and that is the server's doing.** The podium used
 * to be one step per place and one host press each, counting down to 1st; it is a
 * single step now because all places pay the same, so the countdown was suspense
 * about a result the crowd step had already settled. Which of the three you were
 * is a nice thing to find on your own face, not three keypresses' worth of show.
 *
 * ## Scrambled seats, and why the order is thrown away
 *
 * `crowd` arrives **in arrival order**, so seating it as given draws the result
 * on the wall a beat early: the room reads the ring clockwise and the podium is
 * already in it. The seating is therefore a shuffle, deterministic off the crowd
 * itself so a frame push mid-reveal does not deal the room a new ring. The pop
 * order is a second shuffle over the seats, so faces land all round the circle
 * rather than sweeping it like a clock hand.
 *
 * **Who is doomed is read off the wire's order, not the seating.** They are two
 * different things and only one of them is on screen.
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
 * ## The one clock
 *
 * The cull runs on a local interval; the podium arrives whole, on the host's key.
 * **Nothing lights up until the cull is finished** — the frame hands over three
 * winners the instant the host presses, and lighting them while half the ring is
 * still standing would answer the question the explosions are asking.
 *
 * A television that *joins* on the podium step has missed the show and must not
 * replay it, so it jumps straight to the end. `joinedLate` is the test, taken on
 * the first render: the podium being already up when this component first painted
 * is the one thing that distinguishes it from the podium arriving while we watch.
 *
 * The middle says **one thing from the first explosion to the last place**: how
 * many places pay. It is the same two lines as the tally it replaces — a number
 * and a label — because it is the same question answered twice, first "how many
 * of you" and then "how many of you counts".
 */

/** Between arrivals on the crowd step. Fast — this is a fill, not a reveal. */
const POP_INTERVAL_MS = 300;

/** Between explosions. Long, on purpose — each one is meant to land on its own. */
const CULL_INTERVAL_MS = 3000;

/**
 * After the last explosion, before the first place lights up.
 *
 * Longer than the 700ms the tile takes to go, so the room gets a breath of an
 * empty-ish ring between "that's everyone out" and "here's third". Without it
 * the winner lights up through the last of somebody else's shards and the two
 * beats read as one event.
 */
const CULL_SETTLE_MS = 1200;

/** How big a face is, by how many are in the ring. A ring of forty is small faces. */
const seatSize = (count: number): number =>
  count <= 6 ? 104 : count <= 10 ? 84 : count <= 16 ? 66 : count <= 26 ? 52 : 40;

/** FNV-1a. A seed off the crowd itself, so the same ring deals the same seats. */
const hash = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** Fisher-Yates over a seeded LCG. Deterministic is the whole requirement. */
function scramble<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface CrowdCircleProps {
  /** The roster, to put a name and a face to an id. */
  players: PublicPlayer[];
  /** `reveal.crowd` — correct ids, fastest first. `[]` is nobody; null never reaches here. */
  crowd: string[];
  /** `reveal.winners` — how many places pay. On the frame from the first reveal step. */
  winners: number;
  /**
   * `reveal.podium` — every paying place, worst first. Empty while the crowd
   * holds, which makes it the frame's own word for "the podium is up" and so the
   * flag the cull is armed by.
   */
  podium: SpeedrunPlace[];
}

export function CrowdCircle({ players, crowd, winners, podium }: CrowdCircleProps) {
  const roster = useMemo(() => new Map(players.map(player => [player.id, player])), [players]);

  /**
   * Identity, not the array. A frame push during the reveal — somebody's phone
   * dropping is enough — hands this the same ids in a new array, and keyed on
   * the array the cull would start over from the first explosion every time,
   * and the ring would be re-dealt under the room.
   */
  const crowdKey = crowd.join(',');

  /** The seating: the wire's order, shuffled. See the note above on why. */
  const seats = useMemo(
    () => (crowdKey ? scramble(crowdKey.split(','), hash(crowdKey)) : []),
    [crowdKey],
  );

  /**
   * When each seat pops on, by seat index. A second shuffle rather than 0,1,2…
   * so the ring fills from everywhere at once instead of sweeping round like a
   * clock hand, which reads as an order and this deliberately has none.
   */
  const popAt = useMemo(() => {
    const order = scramble(seats.map((_, index) => index), hash(`${crowdKey}|pop`));
    return new Map(order.map((seatIndex, step) => [seatIndex, step]));
  }, [seats, crowdKey]);

  /**
   * The doomed, **slowest first** — which is the order they are destroyed in.
   *
   * `crowd` is fastest-first, so this is its tail, reversed. Shorter than
   * `winners` means everybody who was right is in the money and there is nothing
   * to cull, which is the four-people-right case and the one-person-right case
   * both.
   */
  const doomed = useMemo(() => crowd.slice(winners).reverse(), [crowd, winners]);

  const [arrived, setArrived] = useState(0);
  const [destroyed, setDestroyed] = useState(0);
  /** The beat after the last explosion has landed. Nothing pays out before it. */
  const [settled, setSettled] = useState(false);

  // The podium has landed. Until it does the ring just stands there, which is
  // the beat the whole format is built on.
  const culling = podium.length > 0;

  /**
   * **We mounted with the podium already up, so the room has seen all of this.**
   *
   * A television reconnecting onto the podium step must not deal the ring again
   * and blow it up again for a result that went on screen a minute ago. Read on
   * the first render and never updated, which is exactly the distinction wanted:
   * arriving at the podium while mounted is the show, finding it there is not.
   */
  const joinedLate = useRef(culling);

  useEffect(() => {
    setArrived(0);
    setDestroyed(0);
    setSettled(false);
  }, [crowdKey]);

  // The fill. Skipped wholesale once the podium is running — a television that
  // reconnects onto a podium step must not spend four seconds dealing a ring the
  // room watched fill a minute ago.
  useEffect(() => {
    if (culling) {
      setArrived(seats.length);
      return;
    }
    if (seats.length === 0) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setArrived(seats.length);
      return;
    }

    // The first face lands on the step, not 300ms into it — "0 got it right" is
    // a sentence the middle should never be caught holding.
    setArrived(n => Math.max(n, 1));

    const id = setInterval(() => {
      setArrived(n => {
        if (n + 1 >= seats.length) clearInterval(id);
        return Math.min(n + 1, seats.length);
      });
    }, POP_INTERVAL_MS);

    return () => clearInterval(id);
  }, [culling, seats.length, crowdKey]);

  useEffect(() => {
    if (!culling || doomed.length === 0) return;

    // Somebody who asked for less motion did not ask to wait eighteen seconds to
    // find out who won the question — and neither did a television that walked
    // in on the answer.
    if (joinedLate.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
   * **The breath between the cull and the money.**
   *
   * `destroyed` reaching the end only means the last tile has *started* going;
   * it has 700ms of shattering left. Lighting third place on that same frame put
   * the payout underneath somebody else's debris, which is why the two beats
   * were running into each other.
   *
   * Nothing to cull settles immediately — there is no explosion to wait out, and
   * a second of nothing before an instant podium is just a stall.
   */
  useEffect(() => {
    if (!culling || destroyed < doomed.length) return;
    if (doomed.length === 0 || joinedLate.current) {
      setSettled(true);
      return;
    }

    const id = setTimeout(() => setSettled(true), CULL_SETTLE_MS);
    return () => clearTimeout(id);
  }, [culling, destroyed, doomed.length]);

  /** How far through the cull we are. Nothing pays out until this is false. */
  const purging = culling && !settled;

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
      {/* **A number and a label, and it never becomes anything else.** How many
          are on the ring while they land, then how many of them count, held from
          the first explosion to the last place. Two readings of one question, so
          they get one shape — and the number is the thing being read, which is
          why it is the big half both times. */}
      <div className="crowd-circle__centre" aria-live="polite">
        <span className="crowd-circle__tally">{culling ? winners : arrived}</span>
        <span className="crowd-circle__tally-label">
          {culling ? 'fastest score' : 'got it right'}
        </span>
      </div>

      {seats.map((id, index) => {
        const player = roster.get(id);
        const queued = cullIndex.get(id);
        const gone = queued !== undefined && queued < destroyed;
        const landed = (popAt.get(index) ?? 0) < arrived;
        // The wire's word, and only once the cull has finished arguing with it.
        const won = purging ? undefined : paid.get(id);

        return (
          <div
            key={id}
            className={
              'crowd-circle__seat' +
              (landed ? ' crowd-circle__seat--in' : '') +
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
