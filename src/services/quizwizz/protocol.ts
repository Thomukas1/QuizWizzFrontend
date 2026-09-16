/**
 * The wire contract — every event name and payload shape, in both directions.
 *
 * Dependency-free on purpose: this file is copied verbatim into the React client
 * so neither side ever types an event name as a string literal.
 *
 * **This file is the authority and the copy runs server → client.** When it
 * changes, copy it into `QuizWizzFrontend/src/services/quizwizz/protocol.ts`
 * unedited; a drifted copy is the one bug that produces silence rather than an
 * error.
 */

/** Who a connection is. A `display` role can be added as a row if the TV ever splits off. */
export type Role = 'host' | 'player';

/**
 * The outer loop.
 *
 * ```
 * LOBBY → GAME → RESULTS →┐
 *           ↑              │   the playlist has more games
 *           └──────────────┤
 *                          ↓   the playlist is exhausted
 *                        FINAL
 * ```
 *
 * **Three of these belong to the engine and one belongs to the module.** That is
 * the only distinction a client needs, and it is `phase === 'GAME'` — there is
 * deliberately no table of which phases are "a break", because the question
 * "is a round happening" is now the phase itself rather than something derived
 * from it.
 *
 * A game owns everything between its title card and its last reveal, including
 * both of those. The engine does not know what a question is.
 *
 * `RESULTS` is entered after *every* game, the last one included: it is where
 * the module's awards land, so skipping it for the final game would leave them
 * nowhere to go.
 */
export type Phase = 'LOBBY' | 'GAME' | 'RESULTS' | 'FINAL';

/**
 * **What kind of clock is running** — the one thing a countdown cannot work out
 * from two timestamps.
 *
 * Every game arms the same `Deadline`, but a 1.5-second lead-in, a 30-second
 * question and a 2-second last-chance tail are three different things on screen,
 * and without this the client can only guess by switching on the running game's
 * own step ids — which means every game reimplements the guess and no single
 * timer component is possible.
 *
 * Deliberately about **what the clock is for** rather than what the game is:
 * `live` is a quiz question, sixty seconds of popping balloons, and a buzzer
 * window, because all three want the same big bar.
 *
 * There is no label here on purpose. "Get ready" is copy, and copy belongs to
 * the client that has the fonts, the room to put it and the language to say it
 * in — the server saying which of four things is happening is the whole of what
 * only the server knows.
 */
export type TimerKind =
    /** A lead-in. Inputs are dead and nobody should be racing it. */
    | 'prepare'
    /** The main event. Inputs are live and the bar is the biggest thing on screen. */
    | 'live'
    /** The tail after an auto-lock. Short and urgent: everyone else is already in. */
    | 'lastChance'
    /** A beat the room is not meant to watch — a drumroll, a lock pause. Usually hidden. */
    | 'beat';

/**
 * A deadline is two absolute server timestamps and what they are for, shipped
 * once. Clients count down locally against it; nothing ticks over the wire.
 */
export interface Deadline {
    startedAt: number;
    endsAt: number;
    kind: TimerKind;
}

/**
 * What represents a player on screen.
 *
 * A tagged union rather than a string, so the client branches **once**, in one
 * `<Avatar>` component, instead of sniffing whether a string is a glyph or a URL
 * at every call site. A photo is then a second member here —
 * `{ kind: 'image'; url: string; width: number; height: number }` — plus a row in
 * the validator, and no other field, type or render site changes.
 */
export type Avatar =
    | { kind: 'emoji'; emoji: string };

export type AvatarKind = Avatar['kind'];

/**
 * **What a reaction button is.** One per emoji the receiving player may send,
 * in bar order, on their snapshot.
 *
 * The client used to build this itself: the palette out of `config.ts`, plus the
 * player's own avatar pulled back out of the union and appended. That worked and
 * it was wrong — the rule for *what may be sent* was written down in two
 * codebases, and the server's copy was the only one that decided anything. A
 * client that got it wrong got silence, because an off-list reaction is dropped
 * without a refusal. Now the server says what the buttons are and enforces
 * exactly that list, so the two cannot drift apart.
 *
 * `kind` is what the bar renders from, not what it sends — a `self` button gets
 * its own colour because it is a wave rather than a mood. There is at most one
 * of them, and a player whose avatar has no emoji to send simply gets a shorter
 * list rather than a button that does nothing.
 */
export type ReactionKind = 'palette' | 'self';

export interface ReactionOption {
    emoji: string;
    kind: ReactionKind;
}

export interface PublicPlayer {
    id: string;
    name: string;
    avatar: Avatar;
    connected: boolean;
    score: number;
    /**
     * 1-based, sequential, **no shared ranks and no gaps**. Ties break by join
     * order. A podium holds exactly three people, and "who is on the box" must
     * not be a question the wire leaves open at the loudest moment of the night.
     */
    rank: number;
    /**
     * What `rank` was before the last completed game, so the movement arrows are
     * on the wire rather than diffed from whatever the client happened to see
     * last. That diff produced nothing at all for a phone that reconnected
     * during the animation — which is the single most likely moment for a phone
     * to reconnect, because that is when everyone is looking at their phone.
     *
     * Changes **only** on a `GAME` → `RESULTS` transition and then holds, so the
     * always-on standings keep meaning "since the last game" rather than going
     * blank the moment the next one starts. Null until the first game is scored.
     */
    previousRank: number | null;
}

export interface ScoreTotal {
    playerId: string;
    score: number;
}

export interface PublicLedgerEntry {
    id: string;
    gameIndex: number;
    playerId: string;
    delta: number;
    /** Written by the module and read out on a television: "1st fastest", "survived". */
    reason: string;
    at: number;
}

/** A `toDisplay` / `toPlayer` projection, tagged so a client can drop stale frames. */
export interface ViewFrame {
    /** One playthrough of one game. Every submission carries it. */
    runId: string;
    gameId: string;
    rev: number;
    state: unknown;
    /**
     * **The** deadline, and the only place one appears.
     *
     * It rides on the frame rather than on `session:phase` because a game runs
     * its intro, its questions and its reveals inside a single `GAME` phase —
     * the phase does not change between steps, so a deadline attached to the
     * phase could only be set once per game. On the frame it is naturally
     * per-step, there is still exactly one at a time because there is exactly
     * one current frame, and it inherits the stale-frame rule for free: a
     * dropped frame drops its deadline with it and `rev` stops an old one
     * overwriting a new one.
     *
     * Null for a step that isn't timed — the honest value, rather than a
     * leftover from two steps ago.
     */
    deadline: Deadline | null;
}

/** A game named but not yet running — what `RESULTS` shows as "next up". */
export interface GameRef {
    gameId: string;
    title: string;
}

/** The game currently running, or the one that just did. */
export interface GameRun {
    runId: string;
    gameId: string;
    title: string;
}

/** Everything a freshly connected client needs to paint the current moment. */
export interface SessionSnapshot {
    sessionId: string;
    code: string;
    phase: Phase;
    gameIndex: number;
    gameCount: number;
    /** Set during `GAME` and through the `RESULTS` that follows it. Null in `LOBBY` and `FINAL`. */
    game: GameRun | null;
    /**
     * What `RESULTS` announces along the bottom. **Null means the next stop is
     * `FINAL`.** It has to be here and not only on the phase message, or a phone
     * that reconnects mid-`RESULTS` has no way to learn what is coming.
     */
    upNext: GameRef | null;
    players: PublicPlayer[];
    /** The receiving client's own view, and where its deadline lives. Null outside `GAME`. */
    view: ViewFrame | null;
    /** Set for a player connection only — its own identity, echoed back. */
    you: { playerId: string; name: string; avatar: Avatar; score: number } | null;
    /**
     * Every emoji this connection may send, in bar order. Empty for the host,
     * which has no reaction bar.
     *
     * On the snapshot rather than on its own message because it cannot change
     * within a session — the palette is a constant and an avatar is picked at
     * the door — and a reconnect re-delivers it with everything else.
     */
    reactions: ReactionOption[];
    /** Server time at send, so a client can seed its clock offset before the first ping. */
    tServer: number;
}

/**
 * Refusal reasons. A client decides what to do from the `reason`, never from the
 * message — add to the union rather than inventing prose to parse.
 */
export type QuizWizzReason =
    | 'not_configured'
    | 'bad_password'
    | 'invalid_token'
    | 'token_expired'
    | 'wrong_role'
    | 'no_live_session'
    | 'session_ended'
    | 'session_full'
    | 'unknown_player'
    | 'player_kicked'
    | 'name_required'
    | 'name_too_long'
    | 'name_rejected'
    | 'avatar_required'
    | 'avatar_rejected'
    | 'unknown_event'
    | 'malformed_payload'
    | 'unknown_command'
    | 'unknown_game'
    | 'wrong_phase'
    | 'stale_run'
    | 'too_late'
    /**
     * You already answered this one. **A refusal the phone should not show as an
     * error** — it means "locked in", and it is the expected reply to a
     * double-tap or a resend after a reconnect. Distinct from `too_late`, which
     * is a chance missed, and from `not_allowed`, which is buttons that were
     * never live: three different sentences for a phone to say.
     */
    | 'already_answered'
    | 'not_allowed';

/**
 * Commands the **engine** owns. `next` is the spacebar and 90% of the
 * interaction.
 *
 * During `GAME` every command goes to the module first. An unclaimed one is
 * refused `not_allowed` rather than falling through — the engine has no `next`
 * behaviour while a game is running, and a game that ends because its module
 * forgot to claim a key is a game that ends early in front of the room.
 * `skipGame` is the exception and the escape hatch: it force-ends the game with
 * no awards, without consulting the module, which is what makes refusing the
 * others safe.
 */
export type EngineCommand =
    | 'next'
    | 'skipGame'
    | 'jumpTo'
    /**
     * Still the engine's, even though the module is what *sets* a deadline: the
     * engine owns the storage it lives in and the frame it ships on, and a
     * module judging submissions reads the extended value back through its
     * context. Keeping it here means "someone's phone dropped" needs no
     * cooperation from the format that happens to be running.
     */
    | 'extendTimer'
    | 'adjustScore'
    | 'kick'
    | 'rename'
    | 'setPlaylist'
    | 'endSession';

/**
 * Open on purpose. Anything that isn't an `EngineCommand` is forwarded to the
 * running module verbatim, so a game can define `lock`, `revealStep`, `pause` or
 * anything else it likes **without a protocol change** — which is the "one
 * server folder, two components, one registry line" property working as
 * intended. They used to be listed in this union, which meant the engine's wire
 * contract had to name every command every game might ever want.
 */
export type HostCommand = EngineCommand | (string & {});

export type ClientMessage =
    | { type: 'sync:ping'; payload: { t0: number } }
    | { type: 'player:react'; payload: { emoji: string } }
    | { type: 'player:answer'; payload: { runId: string; itemId: string; choice: unknown } }
    | { type: 'player:input'; payload: { runId: string; seq: number; type: string; payload?: unknown } }
    /**
     * **"I am not coming back."** The one thing a closing socket cannot say.
     *
     * A dropped connection and a deliberate quit look identical at the transport
     * layer, and the server is right to treat silence as the former: a phone in a
     * pocket goes grey in the roster, keeps its score, and repaints on reconnect.
     * That leaves no way to say the other thing — which is the case that actually
     * needs saying, because the reason someone quits is usually a misspelled name
     * or the wrong avatar, and the fix is to be *gone* and join again fresh.
     *
     * So the server removes the player outright rather than marking them
     * disconnected: out of the roster, out of the standings, everyone else
     * re-ranked over who is left, and their socket closed. Their token dies with
     * the row and through nothing else — there is no revocation list, the token
     * simply names a player this session no longer has, so a stale tab still
     * holding that pass reconnects into `unknown_player`, which is already a
     * no-retry ending on the client. Rejoining is then an ordinary `/join`: new
     * `playerId`, score at zero, and the name they quit holding is free again.
     *
     * Empty payload — the sender is the token on the connection, so a player may
     * only ever remove themselves and there is no `playerId` here to forge.
     * Removing somebody else is `kick`, which is the host's.
     *
     * Unbound to `runId`, unlike the two messages above it: those are pinned so a
     * submission for the previous game cannot score against the one on screen
     * now, but mid-question is the likeliest moment to give up on the evening,
     * and a quit refused as `stale_run` is a phone that cannot leave.
     */
    | { type: 'player:leave'; payload: Record<string, never> }
    | { type: 'host:command'; payload: { cmd: HostCommand; args?: Record<string, unknown> } };

export type ServerMessage =
    | { type: 'session:snapshot'; payload: SessionSnapshot }
    /**
     * Absorbs what `round:begin` used to carry. There is no separate begin/end
     * pair any more: entering `GAME` mounts the module's components and leaving
     * it tears them down, and a second message saying so is a second ordering to
     * get wrong. The old `rules?: string` is gone outright — a game's rules
     * screen is something the module draws in its own projection now, with
     * whatever layout and pacing it wants.
     */
    | { type: 'session:phase'; payload: { phase: Phase; gameIndex: number; gameCount: number; game: GameRun | null; upNext: GameRef | null } }
    | { type: 'view:display'; payload: ViewFrame }
    | { type: 'view:player'; payload: ViewFrame }
    | { type: 'roster:update'; payload: { players: PublicPlayer[] } }
    | { type: 'react:burst'; payload: { items: { playerId: string; emoji: string }[] } }
    | { type: 'answer:ack'; payload: { itemId: string; accepted: boolean; reason?: QuizWizzReason } }
    | { type: 'score:update'; payload: { entries: PublicLedgerEntry[]; totals: ScoreTotal[] } }
    | { type: 'sync:pong'; payload: { t0: number; tServer: number } }
    | { type: 'kicked'; payload: Record<string, never> }
    | { type: 'error'; payload: { reason: QuizWizzReason; message: string } };

export type ClientEventName = ClientMessage['type'];
export type ServerEventName = ServerMessage['type'];

export const CLIENT_EVENTS: readonly ClientEventName[] = [
    'sync:ping',
    'player:react',
    'player:answer',
    'player:input',
    'player:leave',
    'host:command',
];

/** HTTP shapes. The socket carries gameplay; these three are the doors into it. */
export interface HostLoginResponse {
    success: true;
    token: string;
    sessionId: string;
    code: string;
    /** Where to point the QR code. Absolute when QUIZWIZZ_PLAY_URL is set. */
    joinUrl: string;
}

export interface PlayerJoinResponse {
    success: true;
    token: string;
    playerId: string;
    /** The name as accepted — trimmed, and suffixed if it was already taken. */
    name: string;
    avatar: Avatar;
    sessionId: string;
    code: string;
}

export interface LiveSessionResponse {
    success: true;
    live: boolean;
    code: string | null;
    phase: Phase | null;
    playerCount: number;
}
