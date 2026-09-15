import { WS_URL } from './client';
import { resetClock, sampleOffset, seedOffset } from './clock';
import { clearHostToken, clearPlayerIdentity, readHostToken, readPlayerIdentity } from './identity';
import type { ClientMessage, QuizWizzReason, Role, ServerMessage } from './protocol';
import { apply, setEnding, setStatus } from './store';

/**
 * **The connection.**
 *
 * The token goes in the query string and is checked on *every* connect, not just
 * the first. That is the whole reconnection design: there is no resume
 * handshake and no replay. You reconnect, you re-authenticate, you get a full
 * `session:snapshot`, you repaint. Written once, it serves the first connect and
 * the fortieth identically — which is the only way a phone that spent the round
 * in someone's pocket comes back correct.
 *
 * The server pings every `HEARTBEAT_MS` and terminates a socket that doesn't
 * answer. Browsers answer automatically, so there is nothing to implement here —
 * but it is why a dead connection is noticed within about 50 seconds.
 */

/**
 * Failures that must not be retried. Retrying one is an infinite loop against a
 * server that will never say yes — and on a phone, a battery-eating one.
 *
 * `clearIdentity` is the difference between "join again" and "there is nothing
 * to go back to". A kicked or unknown player holds a pass that will never work
 * again, so it goes; `session_ended` is the game simply being over, and the
 * token stays valid for a session that no longer needs it.
 */
const NO_RETRY: Partial<Record<QuizWizzReason, { clearIdentity: boolean; message: string }>> = {
  player_kicked: { clearIdentity: true, message: "You're out — the host removed you." },
  invalid_token: { clearIdentity: true, message: 'That game is over.' },
  token_expired: { clearIdentity: true, message: 'Your pass expired. Join again.' },
  unknown_player: { clearIdentity: true, message: "You're not on the roster. Join again." },
  // Cleared, despite this being the graceful ending. An ended session can never
  // be rejoined — the server keeps it in memory with `endedAt` set, so a pass
  // for it resolves and is refused *forever*. Keeping the pass meant a phone
  // re-entering the dead game on every load with no route to the live one.
  //
  // This only fires on a *connect* to a session already over. A game ending
  // under an open socket arrives as a FINAL phase instead, so nobody loses
  // their standings screen to this.
  session_ended: { clearIdentity: true, message: 'The game has ended.' },
};

/** 0.5s, 1s, 2s, 4s, then 5s forever. Jittered, so forty phones don't retry in lockstep. */
const BACKOFF_MS = [500, 1000, 2000, 4000, 5000];

/** How many clock samples to take per connection, and how far apart. Best-of wins. */
const SYNC_SAMPLES = 5;
const SYNC_SPACING_MS = 250;

/** How long a woken tab waits for a pong before deciding its socket is a corpse. */
const PROBE_TIMEOUT_MS = 3000;

let socket: WebSocket | null = null;
let role: Role | null = null;
let attempt = 0;

/** Set by an ending or a deliberate disconnect. While true, nothing reconnects. */
let stopped = true;

let retryTimer: ReturnType<typeof setTimeout> | undefined;
let syncTimers: ReturnType<typeof setTimeout>[] = [];
let probeTimer: ReturnType<typeof setTimeout> | undefined;

const tokenFor = (which: Role): string | null =>
  which === 'host' ? readHostToken() : (readPlayerIdentity()?.token ?? null);

function clearTimers(): void {
  clearTimeout(retryTimer);
  clearTimeout(probeTimer);
  for (const timer of syncTimers) clearTimeout(timer);
  syncTimers = [];
}

/** Send, if there's anywhere to send to. A message fired at a closed socket is dropped. */
export function send(message: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

/**
 * Five pings a few hundred milliseconds apart. Spread rather than fired at once,
 * because five simultaneous pings share one congested moment and measure it five
 * times; spaced, they sample five moments and the quietest one wins.
 */
function runClockHandshake(): void {
  resetClock();
  for (let i = 0; i < SYNC_SAMPLES; i++) {
    syncTimers.push(
      setTimeout(() => send({ type: 'sync:ping', payload: { t0: Date.now() } }), i * SYNC_SPACING_MS),
    );
  }
}

/** Stop for good, and say why. The painted state stays on screen. */
function end(reason: QuizWizzReason | 'kicked', clearIdentity: boolean, message: string): void {
  stopped = true;
  clearTimers();
  if (clearIdentity) {
    if (role === 'host') clearHostToken();
    else clearPlayerIdentity();
  }
  setEnding({ reason, message });
  socket?.close();
  socket = null;
}

function scheduleRetry(): void {
  if (stopped) return;
  setStatus('reconnecting');
  const base = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
  attempt++;
  clearTimeout(retryTimer);
  retryTimer = setTimeout(open, base + Math.random() * base * 0.3);
}

function handle(raw: MessageEvent): void {
  let message: ServerMessage;
  try {
    message = JSON.parse(raw.data as string) as ServerMessage;
  } catch {
    return; // not ours, or truncated; the next frame is complete anyway
  }

  // Two messages never reach the reducer. The clock's, because it changes
  // nothing anyone renders — and the endings, because deciding to stop is this
  // file's job, not the store's.
  if (message.type === 'sync:pong') {
    clearTimeout(probeTimer); // the socket answered: it isn't a corpse
    sampleOffset(message.payload.t0, message.payload.tServer);
    return;
  }

  if (message.type === 'kicked') {
    return end('kicked', true, "You're out — the host removed you.");
  }

  if (message.type === 'error') {
    const fatal = NO_RETRY[message.payload.reason];
    if (fatal) return end(message.payload.reason, fatal.clearIdentity, fatal.message);
  }

  // A snapshot carries the server's clock, so the countdown is roughly right
  // before the first ping lands rather than a second after it.
  if (message.type === 'session:snapshot') seedOffset(message.payload.tServer);

  apply(message);
}

function open(): void {
  if (!role) return;
  const token = tokenFor(role);
  // No pass, no socket. The route shows its door instead — this is the ordinary
  // first-visit state, not a failure.
  if (!token) return setStatus('idle');

  clearTimers();
  socket?.close();

  setStatus(attempt === 0 ? 'connecting' : 'reconnecting');
  const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
  socket = ws;

  ws.onopen = () => {
    if (socket !== ws) return; // superseded while connecting
    attempt = 0;
    setStatus('open');
    runClockHandshake();
  };

  ws.onmessage = event => {
    if (socket === ws) handle(event);
  };

  // `error` and `close` both land here, and a failed connection fires both. The
  // identity check keeps the second one from scheduling a duplicate retry.
  ws.onclose = () => {
    if (socket !== ws) return;
    socket = null;
    scheduleRetry();
  };

  ws.onerror = () => {
    // Nothing to read — the browser deliberately gives no detail. `close`
    // follows and does the work.
  };
}

/**
 * A backgrounded phone very often has a socket that is dead without ever having
 * fired `close` — the OS froze the tab and the FIN arrived to nobody. So on the
 * way back: reconnect if it's visibly shut, and if it merely *claims* to be open,
 * make it prove it. A ping it doesn't answer within a few seconds means a corpse,
 * and closing it routes into the ordinary retry path.
 */
function onVisible(): void {
  if (document.visibilityState !== 'visible' || stopped || !role) return;

  if (socket?.readyState === WebSocket.OPEN) {
    clearTimeout(probeTimer);
    probeTimer = setTimeout(() => socket?.close(), PROBE_TIMEOUT_MS);
    send({ type: 'sync:ping', payload: { t0: Date.now() } });
    return;
  }

  attempt = 0; // a returning user waits for nothing
  open();
}

/**
 * Connect as `host` or `player`, using whichever token that role stored. Safe to
 * call again with the same role — it reconnects rather than stacking sockets.
 */
export function connect(as: Role): void {
  role = as;
  stopped = false;
  attempt = 0;
  document.removeEventListener('visibilitychange', onVisible);
  document.addEventListener('visibilitychange', onVisible);
  open();
}

/** Deliberately leave. No retry, no ending — the caller knows why it did this. */
export function disconnect(): void {
  stopped = true;
  clearTimers();
  document.removeEventListener('visibilitychange', onVisible);
  socket?.close();
  socket = null;
  setStatus('idle');
}
