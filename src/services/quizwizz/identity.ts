/**
 * **What `localStorage` is allowed to hold: identity, and nothing else.**
 *
 * A token, a playerId, and the host's token. Not the roster, not the phase, not
 * a cached view — every one of those arrives in `session:snapshot` on connect,
 * and a stored copy is a copy that can be wrong. The reason the reconnection
 * design has no resume protocol is that there is nothing on this side worth
 * resuming; keeping it that way is what makes the fortieth reconnect behave like
 * the first.
 *
 * Host and player are separate keys rather than one slot. During development one
 * browser is routinely both — the TV in one tab and a phone simulated in another
 * — and a single slot would have each door evict the other's pass.
 *
 * Deliberately **no expiry is stored** beside the token. The server mints it and
 * the server judges it: a dead token comes back `token_expired` on connect, the
 * no-retry table clears it and the join form reappears. A client-side expiry
 * would be a second opinion about a question that already has an authority, and
 * the two would disagree the moment `TOKEN_TTL_SECONDS` changed.
 */

const HOST_KEY = 'quizwizz.host';
const PLAYER_KEY = 'quizwizz.player';

export interface PlayerIdentity {
  token: string;
  playerId: string;
  /**
   * **Which game this pass is for.**
   *
   * Not game state, despite looking like it — it is the *scope* of the
   * credential, and a token without it is a key with no idea which lock it
   * belongs to. That was a real failure: a phone holding a pass from an ended
   * session would rejoin itself into it on every load, be refused with
   * `session_ended`, and have no way to reach the join form for the game that
   * was actually running.
   *
   * The code rather than the `sessionId`, only because `GET /quizwizz/session`
   * publishes the code and not the id. Both come back from the join, so if that
   * endpoint ever grows a `sessionId` this should switch to it — a 4-character
   * code from a 27-character alphabet can in principle repeat, and the id
   * cannot.
   */
  code: string;
}

// Storage throws rather than returning null in a blocked context (Safari private
// browsing, an embedded webview with site data off). Every access is wrapped:
// the game still works without it, it just won't survive a reload — and a party
// is not the place to discover that the whole app white-screened over a
// convenience.
function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked — this session simply won't survive a reload */
  }
}

export function readHostToken(): string | null {
  const stored = read(HOST_KEY) as { token?: string } | null;
  return stored?.token ?? null;
}

export function writeHostToken(token: string): void {
  write(HOST_KEY, { token });
}

export function clearHostToken(): void {
  write(HOST_KEY, null);
}

export function readPlayerIdentity(): PlayerIdentity | null {
  const stored = read(PLAYER_KEY) as Partial<PlayerIdentity> | null;
  // `code` is required, so a pass written before it existed reads as no pass at
  // all. That is the intent: those are precisely the stuck ones, and one
  // re-join clears a phone that would otherwise never reach a join form again.
  if (!stored?.token || !stored.playerId || !stored.code) return null;
  return { token: stored.token, playerId: stored.playerId, code: stored.code };
}

export function writePlayerIdentity(identity: PlayerIdentity): void {
  write(PLAYER_KEY, identity);
}

export function clearPlayerIdentity(): void {
  write(PLAYER_KEY, null);
}
