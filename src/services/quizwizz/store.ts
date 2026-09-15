import type {
  Deadline,
  Phase,
  PublicLedgerEntry,
  PublicPlayer,
  QuizWizzReason,
  ScoreTotal,
  ServerMessage,
  SessionSnapshot,
  ViewFrame,
} from './protocol';

/**
 * **The whole client state, in one reducer over server messages.**
 *
 * Every field here was put there by the server. Nothing is derived, nothing is
 * merged, and in particular **nothing computes a score** — totals arrive in
 * `roster:update` and `score:update`, because a client-held score is a
 * client-editable score and this runs on the guests' own phones.
 *
 * It's a module-scope observable rather than a context so the socket (which is
 * not React) and the components can share one truth. React reads it through
 * `useSyncExternalStore`; see `hooks/quizwizz`.
 */

export type ConnectionStatus =
  /** No token, or nothing has been asked of the socket yet. Show the door. */
  | 'idle'
  | 'connecting'
  | 'open'
  /** The socket dropped and a retry is armed. The last painted state stays on screen. */
  | 'reconnecting'
  /** Stopped for good. Always paired with an `ending`. */
  | 'closed';

/**
 * Why the connection stopped, when it stopped in a way that must not be retried.
 * `kicked` isn't a `QuizWizzReason` — it arrives as its own message type — but it
 * ends a session exactly like one, so it's folded in here.
 */
export interface Ending {
  reason: QuizWizzReason | 'kicked';
  message: string;
}

export interface QuizWizzState {
  status: ConnectionStatus;
  ending: Ending | null;

  // ── The moment, as last described by the server ──────────────────────────
  sessionId: string | null;
  /** Goes on the TV. Null until the first snapshot lands. */
  code: string | null;
  phase: Phase | null;
  roundIndex: number;
  roundCount: number;
  /** **The** deadline. There is only ever one, and it only arrives with a phase. */
  deadline: Deadline | null;
  round: SessionSnapshot['round'];
  players: PublicPlayer[];
  /** This client's own projection — `toDisplay` for the host, `toPlayer` for a phone. */
  view: ViewFrame | null;
  /** Players only. The host has no `you`. */
  you: SessionSnapshot['you'];

  // ── Transient things a component reacts to rather than renders ───────────
  /** Host only. *Who* has answered, never *what* — the ids are all the server sends. */
  progress: { answered: string[]; total: number } | null;
  /** The latest scoring pass, for "+3 — 1st fastest" flyups. */
  scores: { entries: PublicLedgerEntry[]; totals: ScoreTotal[] } | null;
  /**
   * Host only, for the particle field. `seq` ticks on every burst so an effect
   * can fire on a burst identical to the one before it — eight people mashing 🔥
   * produces exactly that, and a value-compared effect would swallow it.
   */
  burst: { seq: number; items: { playerId: string; emoji: string }[] } | null;
  /** The last `answer:ack`, to confirm or unlock the phone's UI. `seq` as above. */
  ack: { seq: number; itemId: string; accepted: boolean; reason?: QuizWizzReason } | null;
  /** A refused command or event. Show it as a toast; you're operating this while talking to a room. */
  refusal: { seq: number; reason: QuizWizzReason; message: string } | null;
}

const EMPTY: QuizWizzState = {
  status: 'idle',
  ending: null,
  sessionId: null,
  code: null,
  phase: null,
  roundIndex: 0,
  roundCount: 0,
  deadline: null,
  round: null,
  players: [],
  view: null,
  you: null,
  progress: null,
  scores: null,
  burst: null,
  ack: null,
  refusal: null,
};

let state: QuizWizzState = EMPTY;

/**
 * The highest `rev` rendered so far. Monotonic across the whole session, so one
 * counter covers every round. Frames are always *complete* — never patches — so
 * dropping a late-arriving older one costs nothing, and applying it would show a
 * question that was already answered.
 */
let lastRev = -1;

/** Ticks the transient fields, so an identical repeat still reads as new. */
let seq = 0;

const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSnapshot = (): QuizWizzState => state;

// `useSyncExternalStore` compares snapshots by identity, so state is replaced
// wholesale and only on an actual change. Returning a fresh object unconditionally
// would re-render the whole app on every heartbeat.
function set(patch: Partial<QuizWizzState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function setStatus(status: ConnectionStatus): void {
  if (state.status !== status) set({ status });
}

/** The connection ended for good. The painted state stays — a kicked player still sees the room. */
export function setEnding(ending: Ending): void {
  set({ status: 'closed', ending });
}

/**
 * Back to nothing: a new identity, or a deliberate leave. Also clears `lastRev`,
 * which is the one piece of state that would otherwise silently reject every
 * frame of the *next* session (whose revs start below this one's).
 */
export function resetStore(): void {
  lastRev = -1;
  state = EMPTY;
  for (const listener of listeners) listener();
}

/**
 * The reducer. One message in, the new moment out.
 *
 * `sync:pong` deliberately doesn't appear: it is the clock's, handled in
 * `socket.ts` before this is reached, and it changes nothing anyone renders.
 */
export function apply(message: ServerMessage): void {
  switch (message.type) {
    /**
     * A full repaint, and the *only* way state is established. Every connect
     * ends here — first or fortieth — which is why reconnection needs no code
     * of its own and no resume protocol exists.
     */
    case 'session:snapshot': {
      const s = message.payload;
      // A different session is a different rev sequence, starting from zero.
      // Carrying the old high-water mark across would silently reject every
      // frame of the new game — the failure that looks like a dead screen
      // rather than an error. Ending a game and starting another in the same
      // tab is the ordinary way to reach this.
      if (s.sessionId !== state.sessionId) lastRev = -1;
      lastRev = s.view?.rev ?? lastRev;
      set({
        sessionId: s.sessionId,
        code: s.code,
        phase: s.phase,
        roundIndex: s.roundIndex,
        roundCount: s.roundCount,
        deadline: s.deadline,
        round: s.round,
        players: s.players,
        view: s.view,
        you: s.you,
        // A snapshot describes the moment, not the events that got here. Anything
        // transient is from before the disconnect and re-showing it would replay
        // an old toast over a freshly painted screen.
        progress: null,
        burst: null,
        ack: null,
        refusal: null,
      });
      break;
    }

    case 'session:phase': {
      const p = message.payload;
      set({
        phase: p.phase,
        roundIndex: p.roundIndex,
        roundCount: p.roundCount,
        deadline: p.deadline,
        // Progress belongs to the phase that was counting. Carrying "9 of 15 in"
        // into the results screen is just a lie with a number in it.
        progress: null,
      });
      break;
    }

    case 'round:begin':
      set({ round: message.payload, ack: null, progress: null });
      break;

    /**
     * Tear down the game component. The view goes with it: a stale projection
     * left on screen is a question still asking to be answered after scoring.
     */
    case 'round:end':
      if (state.round?.roundId === message.payload.roundId) {
        set({ round: null, view: null });
      }
      break;

    // One of these arrives, never both — the server sends `view:display` to the
    // host connection and `view:player` to a phone. Both land in the same field
    // because no client is ever both, and a game component is handed whichever
    // one its side was given.
    case 'view:display':
    case 'view:player': {
      const frame = message.payload;
      if (frame.rev < lastRev) break; // a late frame from before the one on screen
      lastRev = frame.rev;
      set({ view: frame });
      break;
    }

    case 'roster:update':
      set({ players: message.payload.players });
      break;

    case 'answers:progress':
      set({ progress: message.payload });
      break;

    case 'react:burst':
      set({ burst: { seq: ++seq, items: message.payload.items } });
      break;

    case 'answer:ack':
      set({ ack: { seq: ++seq, ...message.payload } });
      break;

    /**
     * Totals are authoritative and arrive alongside the deltas. They're folded
     * into the roster here so a scoreboard has one place to read a score from,
     * whether it was last touched by a scoring pass or a roster update.
     */
    case 'score:update': {
      const { entries, totals } = message.payload;
      const byId = new Map(totals.map(t => [t.playerId, t.score]));
      set({
        scores: { entries, totals },
        players: state.players.map(p =>
          byId.has(p.id) ? { ...p, score: byId.get(p.id)! } : p,
        ),
      });
      break;
    }

    /**
     * A refusal. The endings — `invalid_token`, `player_kicked`, `session_ended`
     * and friends — are intercepted in `socket.ts`, which stops retrying and
     * records an `ending`. Anything still arriving here is an ordinary "no":
     * a wrong phase, a command this round doesn't implement. Toast it.
     */
    case 'error':
      set({ refusal: { seq: ++seq, ...message.payload } });
      break;

    // `kicked` and `sync:pong` are handled by socket.ts — one ends the session,
    // the other belongs to the clock. Neither reaches the reducer.
    default:
      break;
  }
}
