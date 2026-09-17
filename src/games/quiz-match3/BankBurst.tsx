import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { Avatar } from '../../components/Avatar';
import type { PublicPlayer } from '../../services/quizwizz';

/**
 * **Who just banked, thrown up the television.** The format's only interruption,
 * and it does not interrupt anything.
 *
 * `<EmojiStream>` is the model and most of the shape below is lifted from it —
 * a batch of particles spawned off a *sequence* rather than a value, one state
 * update per burst, one sweep for all of them, and nothing animated but
 * `transform` and `opacity`. What changes is what a particle is and what it is
 * for. A reaction is ambient: small, slow, forty at a time, drifting. This is a
 * payout: **five faces the size of a fist, all at once, gone in a second.**
 *
 * The point is the wanting. Somebody who has not banked yet watches three people
 * they know fly up the screen with a `+1` on them, and the next item is already
 * running — which is the whole trick, because the only thing to do about it is
 * answer the one in front of them.
 *
 * ## It is not in the game zone
 *
 * `.game-zone` sets `overflow: hidden` and `isolation: isolate`, so anything
 * rendered inside it is clipped at the zone's edge and cannot paint over the
 * standings or the admin panel — which is right for every other scene and wrong
 * for this one. So the layer is **portalled to `<body>`** and fixed to the
 * viewport at `--z-notification`: the faces climb the whole television and leave
 * over the top of everything, rather than disappearing into a seam two thirds of
 * the way up.
 *
 * Nothing in here takes a pointer event and nothing in here is read by a screen
 * reader — the tile that emptied in the grid is the accessible record of a bank,
 * and this is the noise it makes.
 *
 * ## Once per beat, and only for beats we were here for
 *
 * `settledIndex` is the sequence. Frames are pushed on every submission, so
 * during one eight-second item this component is handed the same `banked` array
 * a dozen times; spawning on "the array is non-empty" would fire that burst a
 * dozen times, which is the bug `<CrowdCircle>` solved with `crowdKey` and the
 * one the contract's own note warns about.
 *
 * The first `settledIndex` a mount sees is **skipped**, for `<CrowdCircle>`'s
 * `joinedLate` reason: a television that reconnects mid-barrage is handed the
 * last closed item's banks, and celebrating them again would be a lie about when
 * they happened. Whatever was on the wire when we arrived has already had its
 * second.
 */

/** Concurrent faces. A whole room banking at once is the good case; past this the oldest go. */
const MAX_FACES = 24;

/**
 * **Two and a half seconds, bottom of the screen to gone.**
 *
 * It was one, which crossed a television fast enough that a face was a blur with
 * a number on it — and the whole point is that the room recognises who it was.
 * Randomised per face so a burst doesn't move as one slab, but only just: the
 * brief is still that they arrive together, so this range is narrow where the
 * emoji field's is wide.
 */
const RISE_MS = { min: 2350, max: 2650 };

/**
 * **The stagger.** They leave together and then spread out, which is what makes
 * five of them read as five people rather than one sprite drawn five times.
 * Small enough to stay one event — past about a quarter of a second the eye
 * starts reading an order into it, and there isn't one.
 */
const STAGGER_MS = 200;

/** Long enough that the last face is off the top before its particle is swept. */
const SWEEP_MS = 500;

/**
 * How big a face is, in pixels, because that is the only way an avatar is sized
 * — and the same number is handed to the stylesheet as `--burst-face` so the
 * badge and the name can be drawn against it. `<CrowdCircle>` and `--seat` are
 * the same arrangement for the same reason.
 *
 * Big enough to be recognised from three metres and no bigger: five of these
 * crossing the screen at once is the whole effect, and at a fist across they
 * stopped being five faces and started being a wall going past.
 */
const FACE_PX = 68;

interface Face {
  id: number;
  player: PublicPlayer;
  style: CSSProperties;
  expiresAt: number;
}

let nextId = 0;

function makeFace(player: PublicPlayer, now: number): Face {
  const rise = RISE_MS.min + Math.random() * (RISE_MS.max - RISE_MS.min);
  const delay = Math.round(Math.random() * STAGGER_MS);
  return {
    id: nextId++,
    player,
    // The delay counts: a face swept while it is still waiting to start would
    // never leave the bottom of the screen.
    expiresAt: now + rise + delay,
    style: {
      /**
       * The spawn column, across the game zone's own 60% band rather than the
       * whole television — they come *off the grid*, which is the middle slice,
       * and a face launching up the left panel would read as the standings
       * doing something.
       */
      left: `${24 + Math.random() * 52}%`,
      '--rise': `${Math.round(rise)}ms`,
      // A little sideways and a little crooked. Two faces on the same column
      // with the same tilt read as one sprite drawn twice.
      '--drift': `${Math.round(-60 + Math.random() * 120)}px`,
      '--tilt': `${Math.round(-14 + Math.random() * 28)}deg`,
      /**
       * **All at once, near enough.** Random rather than by index: an indexed
       * stagger is a queue, and `banked` is in roster order, so it would put the
       * same people at the front of every burst all evening.
       */
      animationDelay: `${delay}ms`,
    } as CSSProperties,
  };
}

interface BankBurstProps {
  /** `banked` — who banked on the item that just closed. Empty on most of them. */
  banked: string[];
  /** The item `banked` describes, and the sequence this fires on. -1 before the first. */
  settledIndex: number;
  /** `pointsPerStreak`, off the frame. The client prints it and never multiplies it. */
  points: number;
  /** The roster, to put a face and a name to an id. */
  players: PublicPlayer[];
}

export function BankBurst({ banked, settledIndex, points, players }: BankBurstProps) {
  const [faces, setFaces] = useState<Face[]>([]);

  /**
   * The last beat spawned. `null` is "we have not seen one yet", which is a
   * different thing from -1 (the barrage hasn't started) and is what makes the
   * first frame after a mount a skip rather than a replay.
   */
  const lastSettled = useRef<number | null>(null);

  useEffect(() => {
    if (lastSettled.current === settledIndex) return;

    // Whatever was already on the wire when this mounted belongs to an item the
    // room has already watched close. Take the sequence and celebrate nothing.
    const joinedLate = lastSettled.current === null;
    lastSettled.current = settledIndex;
    if (joinedLate || banked.length === 0) return;

    const roster = new Map(players.map(player => [player.id, player]));
    const arrivals = banked
      .map(id => roster.get(id))
      // Somebody who banked and then quit before the item closed. They earned
      // it; we just have no face to throw, and a ghost tile flying up the
      // television would be a worse memorial than nothing.
      .filter((player): player is PublicPlayer => player !== undefined);

    if (arrivals.length === 0) return;

    // One update for the whole burst. Fifteen setStates in a frame is how this
    // drops the frame everybody is looking at.
    const now = Date.now();
    setFaces(current => {
      const next = [...current, ...arrivals.map(player => makeFace(player, now))];
      return next.length > MAX_FACES ? next.slice(next.length - MAX_FACES) : next;
    });
    // `players` is deliberately not a dependency: the roster is read at the
    // moment of the beat, and a frame that only changes somebody's score must
    // not be able to re-enter this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settledIndex, banked]);

  // One sweep for everything in flight rather than a timer per face — the same
  // reason `<EmojiStream>` does it, and armed by emptiness so a burst landing on
  // top of another doesn't tear the interval down and rebuild it.
  const idle = faces.length === 0;
  useEffect(() => {
    if (idle) return;
    const id = setInterval(() => {
      const now = Date.now();
      setFaces(current => {
        const live = current.filter(face => face.expiresAt > now);
        return live.length === current.length ? current : live;
      });
    }, SWEEP_MS);
    return () => clearInterval(id);
  }, [idle]);

  if (idle) return null;

  return createPortal(
    <div
      className="bank-burst"
      aria-hidden="true"
      style={{ '--burst-face': `${FACE_PX}px` } as CSSProperties}
    >
      {faces.map(face => (
        <div key={face.id} className="bank-burst__face" style={face.style}>
          <span className="bank-burst__tile">
            <Avatar avatar={face.player.avatar} size={FACE_PX} seed={face.player.id} />
            {/* Upper right, where a payout has landed in every game that ever
                paid one out — and the same corner `<CrowdCircle>` puts it in. */}
            <span className="bank-burst__points">+{points}</span>
          </span>
          <span className="bank-burst__name">{face.player.name}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
}
