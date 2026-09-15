/**
 * The wire contract — every event name and payload shape, in both directions.
 *
 * Dependency-free on purpose: this file is copied verbatim into the React client
 * so neither side ever types an event name as a string literal.
 */

/** Who a connection is. A `display` role can be added as a row if the TV ever splits off. */
export type Role = 'host' | 'player';

/**
 * The outer loop. The engine owns these; a game module owns everything that
 * happens inside ROUND_ACTIVE.
 */
export type Phase =
    | 'LOBBY'
    | 'ROUND_INTRO'
    | 'ROUND_ACTIVE'
    | 'ROUND_RESULTS'
    | 'SCOREBOARD'
    | 'FINAL';

/** A deadline is two absolute server timestamps, shipped once. */
export interface Deadline {
    startedAt: number;
    endsAt: number;
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

export interface PublicPlayer {
    id: string;
    name: string;
    avatar: Avatar;
    connected: boolean;
    score: number;
}

export interface ScoreTotal {
    playerId: string;
    score: number;
}

export interface PublicLedgerEntry {
    id: string;
    roundIndex: number;
    playerId: string;
    delta: number;
    reason: string;
    at: number;
}

/** A `toDisplay` / `toPlayer` projection, tagged so a client can drop stale frames. */
export interface ViewFrame {
    roundId: string;
    gameId: string;
    rev: number;
    state: unknown;
}

/** Everything a freshly connected client needs to paint the current moment. */
export interface SessionSnapshot {
    sessionId: string;
    code: string;
    phase: Phase;
    roundIndex: number;
    roundCount: number;
    deadline: Deadline | null;
    round: { roundId: string; gameId: string; title: string; rules?: string } | null;
    players: PublicPlayer[];
    /** The receiving client's own view. Null for a phase with no active round. */
    view: ViewFrame | null;
    /** Set for a player connection only — its own identity, echoed back. */
    you: { playerId: string; name: string; avatar: Avatar; score: number } | null;
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
    | 'stale_round'
    | 'too_late'
    | 'not_allowed';

/** Commands the host can send. `next` is the spacebar and 90% of the interaction. */
export type HostCommand =
    | 'start'
    | 'next'
    | 'back'
    | 'skipRound'
    | 'jumpTo'
    | 'extendTimer'
    | 'adjustScore'
    | 'kick'
    | 'rename'
    | 'setPlaylist'
    | 'endSession'
    /* Unrecognised here on purpose: anything else is forwarded to the game module. */
    | 'lock'
    | 'revealStep'
    | 'pause'
    | 'resume';

export type ClientMessage =
    | { type: 'sync:ping'; payload: { t0: number } }
    | { type: 'player:react'; payload: { emoji: string } }
    | { type: 'player:answer'; payload: { roundId: string; itemId: string; choice: unknown } }
    | { type: 'player:input'; payload: { roundId: string; seq: number; type: string; payload?: unknown } }
    | { type: 'host:command'; payload: { cmd: HostCommand; args?: Record<string, unknown> } };

export type ServerMessage =
    | { type: 'session:snapshot'; payload: SessionSnapshot }
    | { type: 'session:phase'; payload: { phase: Phase; roundIndex: number; roundCount: number; deadline: Deadline | null } }
    | { type: 'round:begin'; payload: { roundId: string; gameId: string; title: string; rules?: string } }
    | { type: 'round:end'; payload: { roundId: string } }
    | { type: 'view:display'; payload: ViewFrame }
    | { type: 'view:player'; payload: ViewFrame }
    | { type: 'roster:update'; payload: { players: PublicPlayer[] } }
    /** Ids only. Never what anyone answered. */
    | { type: 'answers:progress'; payload: { answered: string[]; total: number } }
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
