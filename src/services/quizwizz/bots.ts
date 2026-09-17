import { QuizWizzError, WS_URL, post } from './client';
import { AVATAR_EMOJI, MAX_PLAYERS } from './config';
import type { Avatar, ClientMessage, PlayerJoinResponse, ServerMessage, ViewFrame } from './protocol';

/**
 * **The test harness: NPC players.**
 *
 * A bot is a real player and nothing less — it walks through `POST /join` like
 * anyone with a phone, holds a real token, opens a real socket, and appears in
 * the roster, the standings and the podium with no idea anywhere that it isn't a
 * person. That is the whole point: a harness that took a shortcut past the join
 * door, or wrote straight into the store, would test the shortcut instead of the
 * game.
 *
 * Its only judgement is which button to press. It answers whatever looks like a
 * quiz item, at random, on the schedule below.
 *
 * ## Why this doesn't reuse `socket.ts`
 *
 * That module is deliberately one connection: one module-scope socket, one
 * token, one store it writes into. Bots need N sockets that write into *nothing*
 * — a bot frame landing in the store would repaint the host's television with a
 * bot's view of the game. So the connection here is its own, and it is
 * deliberately dumb: no reconnect backoff, no clock handshake, no visibility
 * probe. A bot never counts down a deadline (it acts on frames the server
 * pushes, so it needs no clock), and a bot whose socket drops is simply a bot
 * that is gone. Reconnection is one of the things being tested; a second
 * implementation of it here would only test the copy.
 *
 * **Dev-only by convention** — see `BotControl`, which is what decides whether
 * the button exists at all.
 */

/**
 * How often *any one* bot commits to an answer, across the whole flock.
 *
 * Not per bot: the scheduler fires once per tick and picks one waiting bot, so
 * eight bots answer at 200ms, 400ms, 600ms… rather than eight submissions
 * landing in the same millisecond. That stagger is the reason this exists — it
 * is what makes tiles light up one at a time, what gives "12 / 15 locked in"
 * something to count through, and what gives Speedrun the distinct arrival times
 * it needs before it has a podium worth looking at.
 */
const DECISION_INTERVAL_MS = 200;

/** `bot` plus four digits — 7 characters, well inside `NAME_MAX_LENGTH`. */
const NAME_DIGITS = 4;

const pickOne = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/**
 * **What a bot needs off a frame to be able to play** — a deliberately narrow
 * structural subset of the quiz kit's `QuizPlayerBase`, redeclared here rather
 * than imported.
 *
 * Not duplication for its own sake. `services/` is the bottom layer and `games/`
 * sits on top of it, so importing a game's view type into the service folder
 * would invert that. And the narrowness is honest: these four fields are the
 * entire contract for "a thing with buttons on it", so any future format that
 * projects them is playable by a bot without touching this file. Everything else
 * a quiz ships — the step, the counters, the outcome, the score — is for
 * somebody with eyes.
 *
 * Every field is optional because `ViewFrame.state` is `unknown` and a bot may
 * be handed the frame of a format that looks nothing like this. An unplayable
 * frame makes a bot sit still, never throw.
 */
interface AnswerableFrame {
  /** Whether the buttons are live. The server's word, and the only one that counts. */
  open?: boolean;
  /** Null outside an item — nothing to submit against. */
  itemId?: string | null;
  options?: { key?: string }[];
  /** Echoed back once the server has taken an answer. Non-null means locked in. */
  yourChoice?: string | null;
}

/** A decision a bot has made privately and is queued to send. */
interface PendingAnswer {
  runId: string;
  itemId: string;
  /** Option keys as the frame offered them. The choice is rolled when it fires. */
  options: string[];
}

interface BotRuntime {
  id: string;
  name: string;
  /**
   * Kept as the wire's tagged union rather than the emoji inside it. Nothing
   * outside `<Avatar>` is allowed to look in there, and a harness is not a
   * reason to be the exception.
   */
  avatar: Avatar;
  token: string;
  socket: WebSocket | null;
  /** Stale frames are dropped by `rev`, exactly as the real store drops them. */
  lastRev: number;
  /** `runId:itemId` of everything already sent, so a repeated frame can't double-submit. */
  submitted: Set<string>;
  /** What this bot is waiting for a turn to say. Overwritten by a newer frame. */
  pending: PendingAnswer | null;
  /** Set when we close it on purpose, so `onclose` doesn't report a disconnection. */
  disposed: boolean;
}

// ── The bots, and the little observable the button reads ────────────────────

const runtimes: BotRuntime[] = [];

/** One bot, as the admin panel renders it. */
export interface BotSummary {
  /** The server's own `playerId` — the same id its tile carries in the roster. */
  id: string;
  name: string;
  avatar: Avatar;
  /** Socket open. False for the beat between the join succeeding and the connect. */
  ready: boolean;
}

export interface BotsState {
  bots: BotSummary[];
  /** A join is in flight. Keeps a double-tap from minting two bots. */
  adding: boolean;
  /** Why the last add failed, for a line under the button. Cleared by the next attempt. */
  error: string | null;
}

const NO_BOTS: BotsState = { bots: [], adding: false, error: null };

let state: BotsState = NO_BOTS;
let adding = false;
let error: string | null = null;

const listeners = new Set<() => void>();

export function subscribeBots(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getBotsSnapshot = (): BotsState => state;

// Rebuilt only here, so `useSyncExternalStore` has a stable identity to compare
// between publishes and the panel re-renders on a real change rather than on
// every frame forty bots receive.
function publish(): void {
  state = {
    bots: runtimes.map(bot => ({
      id: bot.id,
      name: bot.name,
      avatar: bot.avatar,
      ready: bot.socket?.readyState === WebSocket.OPEN,
    })),
    adding,
    error,
  };
  for (const listener of listeners) listener();
}

// ── The scheduler: one decision per tick, across the whole flock ────────────

let ticker: ReturnType<typeof setInterval> | undefined;

/**
 * One waiting bot commits, chosen at random rather than in join order.
 *
 * Random because a queue would hand every race to whichever bot joined first —
 * the same name on top of the Speedrun podium every single question, which looks
 * like a working podium right up until it's the thing you were trying to test.
 */
function step(): void {
  const waiting = runtimes.filter(
    bot => bot.pending && bot.socket?.readyState === WebSocket.OPEN,
  );

  if (waiting.length === 0) {
    clearInterval(ticker);
    ticker = undefined;
    return;
  }

  const bot = pickOne(waiting);
  const decision = bot.pending;
  bot.pending = null;
  if (!decision) return;

  const stamp = `${decision.runId}:${decision.itemId}`;
  if (bot.submitted.has(stamp)) return;
  bot.submitted.add(stamp);

  sendAs(bot, {
    type: 'player:answer',
    payload: {
      runId: decision.runId,
      itemId: decision.itemId,
      // The whole of a bot's intelligence.
      choice: pickOne(decision.options),
    },
  });
}

/** Started on demand and stopped when the queue drains — no idle timer all evening. */
function startTicking(): void {
  if (ticker) return;
  ticker = setInterval(step, DECISION_INTERVAL_MS);
}

// ── One bot's connection ────────────────────────────────────────────────────

function sendAs(bot: BotRuntime, message: ClientMessage): void {
  if (bot.socket?.readyState === WebSocket.OPEN) bot.socket.send(JSON.stringify(message));
}

/**
 * Read a frame and decide whether there is anything to say.
 *
 * Queues the intent only — the send happens on the bot's turn in `step`, which
 * is what spaces the flock out. A frame arriving before that turn comes round
 * replaces the intent, so a bot always answers the question currently on screen
 * rather than the one it was thinking about.
 */
function consider(bot: BotRuntime, frame: ViewFrame | null): void {
  if (!frame) return;
  if (frame.rev < bot.lastRev) return; // a late frame from before the one it's acting on
  bot.lastRev = frame.rev;

  const view = frame.state as AnswerableFrame | null;
  const options = (view?.options ?? []).map(option => option.key).filter((key): key is string => !!key);

  // Anything that isn't an open item with buttons on it: sit still, and drop a
  // queued intent if one is held. That last part is what stops a bot answering
  // into the lock beat after the room's answers have already been cut off.
  if (!view?.open || !view.itemId || view.yourChoice != null || options.length === 0) {
    bot.pending = null;
    return;
  }

  if (bot.submitted.has(`${frame.runId}:${view.itemId}`)) {
    bot.pending = null;
    return;
  }

  bot.pending = { runId: frame.runId, itemId: view.itemId, options };
  startTicking();
}

function receive(bot: BotRuntime, raw: MessageEvent): void {
  let message: ServerMessage;
  try {
    message = JSON.parse(raw.data as string) as ServerMessage;
  } catch {
    return;
  }

  switch (message.type) {
    // A bot joining mid-question is handed the question in its snapshot, and
    // should answer it like everyone else who just walked in.
    case 'session:snapshot':
      consider(bot, message.payload.view);
      break;

    case 'view:player':
      consider(bot, message.payload);
      break;

    // Leaving `GAME` tears the frame down for a real phone; a bot holding a
    // queued intent through that would fire it into a finished run and collect a
    // `stale_run` for nothing.
    case 'session:phase':
      if (message.payload.phase !== 'GAME') bot.pending = null;
      break;

    // Kicked, or a refusal that can never be retried. Either way this bot is
    // over — and the host kicking a bot should make it disappear, not leave a
    // greyed-out tile behind.
    case 'kicked':
      dispose(bot);
      break;

    case 'error':
      if (
        message.payload.reason === 'player_kicked' ||
        message.payload.reason === 'invalid_token' ||
        message.payload.reason === 'token_expired' ||
        message.payload.reason === 'unknown_player' ||
        message.payload.reason === 'session_ended'
      ) {
        dispose(bot);
      }
      break;

    default:
      break;
  }
}

/** Forget a bot locally. The socket goes; the roster row is the server's to drop. */
function dispose(bot: BotRuntime): void {
  const at = runtimes.indexOf(bot);
  if (at === -1) return;
  runtimes.splice(at, 1);
  bot.disposed = true;
  bot.pending = null;
  bot.socket?.close();
  bot.socket = null;
  publish();
}

function openSocket(bot: BotRuntime): void {
  const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(bot.token)}`);
  bot.socket = ws;

  ws.onopen = () => publish(); // `ready` — the tile is live
  ws.onmessage = event => receive(bot, event);

  // No backoff and no retry. A bot that loses its socket is a bot that is gone;
  // see the note at the top on why reconnection isn't reimplemented here.
  ws.onclose = () => {
    if (!bot.disposed) dispose(bot);
  };
  ws.onerror = () => {
    /* `close` follows and does the work, exactly as on the real socket */
  };
}

// ── The two things the button calls ─────────────────────────────────────────

/** Four digits, and not one another bot in this browser is already wearing. */
function mintName(): string {
  const taken = new Set(runtimes.map(bot => bot.name));
  const floor = 10 ** (NAME_DIGITS - 1);
  for (let attempt = 0; attempt < 50; attempt++) {
    const name = `bot${Math.floor(floor + Math.random() * floor * 9)}`;
    if (!taken.has(name)) return name;
  }
  // Astronomically unlikely; the server suffixes a collision anyway (`bot1234 2`).
  return `bot${Math.floor(floor + Math.random() * floor * 9)}`;
}

/**
 * **Add one NPC.** Joins through the ordinary door and connects.
 *
 * `api.join()` is deliberately not used: it writes the identity into
 * `localStorage`, which is right for the one real player a browser holds and
 * wrong for every bot after the first — they would evict each other's pass, and
 * the last one would evict a phone tab's. A bot's token lives in memory for as
 * long as the bot does, which is also what makes a reload the way to clear them.
 */
export async function addBot(): Promise<void> {
  if (adding) return;

  if (runtimes.length >= MAX_PLAYERS) {
    error = `That's ${MAX_PLAYERS} — the session cap.`;
    publish();
    return;
  }

  adding = true;
  error = null;
  publish();

  const name = mintName();
  const avatar: Avatar = { kind: 'emoji', emoji: pickOne(AVATAR_EMOJI) };

  try {
    const joined = await post<PlayerJoinResponse>('/join', { name, avatar });
    const bot: BotRuntime = {
      id: joined.playerId,
      // What the server accepted, not what was asked for — it trims and suffixes
      // on collision, and the panel should read what the roster reads.
      name: joined.name,
      avatar: joined.avatar,
      token: joined.token,
      socket: null,
      lastRev: -1,
      submitted: new Set(),
      pending: null,
      disposed: false,
    };
    runtimes.push(bot);
    openSocket(bot);
  } catch (caught) {
    error =
      caught instanceof QuizWizzError ? caught.message : 'Could not add a bot — is a game running?';
  } finally {
    adding = false;
    publish();
  }
}

/**
 * **Send them all home.** `player:leave` rather than a closed socket, because the
 * two mean different things: a dropped socket leaves a greyed-out tile holding a
 * score and a place in the standings, and what you want from a harness is the
 * room back the way you found it. The leave goes first, while there is still a
 * socket to send it on.
 */
export function removeAllBots(): void {
  for (const bot of [...runtimes]) {
    sendAs(bot, { type: 'player:leave', payload: {} });
    dispose(bot);
  }
  error = null;
  publish();
}
