import type {
  GameRef,
  GameRun,
  Phase,
  PublicLedgerEntry,
  PublicPlayer,
  QuizWizzReason,
  ReactionOption,
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
  /**
   * **`GAME` means a module owns the screen; anything else means the engine
   * does.** That is the only branch either view makes, and it is why there is no
   * "is this an intermission" helper: the question is the phase itself.
   */
  phase: Phase | null;
  gameIndex: number;
  gameCount: number;
  /** The game running, or the one that just ended. Null in `LOBBY` and `FINAL`. */
  game: GameRun | null;
  /** What `RESULTS` announces. Null means the next stop is `FINAL`. */
  upNext: GameRef | null;
  players: PublicPlayer[];
  /**
   * This client's own projection — `toDisplay` for the host, `toPlayer` for a
   * phone — **and where the deadline lives.** There is deliberately no
   * `state.deadline`: a game's steps are timed individually inside one phase, so
   * the frame is the only thing that changes often enough to carry one.
   */
  view: ViewFrame | null;
  /** Players only. The host has no `you`. */
  you: SessionSnapshot['you'];
  /**
   * **The reaction bar, as the server composed it** — the palette plus this
   * player's own avatar, in the order the buttons go in. Empty for the host.
   *
   * The phone does not assemble this and must not filter it. It is the same list
   * the server checks a `player:react` against, so a bar built any other way is
   * a bar that can offer a button the server drops in silence.
   */
  reactions: ReactionOption[];

  // ── Transient things a component reacts to rather than renders ───────────
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
  gameIndex: 0,
  gameCount: 0,
  game: null,
  upNext: null,
  players: [],
  view: null,
  you: null,
  reactions: [],
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
        gameIndex: s.gameIndex,
        gameCount: s.gameCount,
        game: s.game,
        upNext: s.upNext,
        players: s.players,
        view: s.view,
        you: s.you,
        reactions: s.reactions,
        // A snapshot describes the moment, not the events that got here. Anything
        // transient is from before the disconnect and re-showing it would replay
        // an old toast over a freshly painted screen.
        burst: null,
        ack: null,
        refusal: null,
      });
      break;
    }

    /**
     * The phase, and everything `round:begin` used to carry.
     *
     * **Leaving `GAME` tears the module's view down**, which is what the deleted
     * `round:end` did. It has to happen here rather than on its own message: a
     * stale projection left on screen is a question still asking to be answered
     * after the scoring is already done, and the deadline rides on that frame
     * now, so a leftover one would keep a timer running through the results.
     */
    case 'session:phase': {
      const p = message.payload;
      set({
        phase: p.phase,
        gameIndex: p.gameIndex,
        gameCount: p.gameCount,
        game: p.game,
        upNext: p.upNext,
        ...(p.phase === 'GAME' ? { ack: null } : { view: null }),
      });
      break;
    }

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

    // `answers:progress` used to be here. "9 of 15 in" is a fact about the
    // module's current item, and once the engine stopped knowing what an item
    // is it could no longer count them — a module that wants the row projects
    // it in its own `toDisplay`, ids only, exactly as before.

    case 'react:burst':
      set({ burst: { seq: ++seq, items: message.payload.items } });
      break;

    case 'answer:ack':
      set({ ack: { seq: ++seq, ...message.payload } });
      break;

    /**
     * The deltas, for the "+3 — 1st fastest" flyups, and nothing else.
     *
     * **It deliberately does not write scores into the roster.** It used to, so
     * that a scoreboard had one place to read from — but a player row now
     * carries `rank` and `previousRank` alongside `score`, and folding a total
     * in here would update one of the three and leave the other two describing
     * the moment before it. The `roster:update` that follows carries all three
     * together and is the only thing that moves a standing.
     */
    case 'score:update':
      set({ scores: message.payload });
      break;

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
