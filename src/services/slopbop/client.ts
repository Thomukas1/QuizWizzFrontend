import { getToken, signOut } from './session';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

/**
 * The parsed JSON of a non-2xx response, or null when there wasn't any. `error`
 * is the one field the whole API agrees on; anything past it is endpoint-specific
 * (a field-error map, a `reason` code) and needs a cast at the point of use —
 * which is where the caller knows what it asked for.
 */
export type ApiErrorBody = { error?: string; reason?: AuthReason; [key: string]: unknown } | null;

/**
 * Stable machine-readable reasons the auth layer refuses a request. Mirrors the
 * backend's `AuthReason` — branch on these rather than on prose or on a status
 * code, because 401 alone can't tell an expired token from a revoked session
 * from a deleted account.
 */
export type AuthReason =
  | 'auth_not_configured'
  | 'invalid_wallet'
  | 'challenge_not_found'
  | 'challenge_expired'
  | 'challenge_spent'
  | 'wallet_mismatch'
  | 'invalid_signature'
  | 'missing_token'
  | 'invalid_token'
  | 'token_expired'
  | 'session_revoked'
  | 'account_not_found'
  | 'account_disabled';

/**
 * The reasons that mean *this session is over*, and what to say about each.
 *
 * Only these end a session. `auth_not_configured` is a 500 and a deploy problem,
 * so it deliberately isn't here — logging someone out because the server lost
 * its JWT secret would be the wrong answer to a problem that isn't theirs. The
 * challenge reasons aren't here either: they come from `/auth/verify`, which is
 * a sign-in *attempt* and has no session to end.
 */
const SESSION_ENDED: Partial<Record<AuthReason, string>> = {
  missing_token: 'Your session ended. Sign in again to continue.',
  invalid_token: 'Your session is no longer valid. Sign in again to continue.',
  token_expired: 'Your session expired. Sign in again to continue.',
  session_revoked: 'You were signed out. Sign in again to continue.',
  account_not_found: 'This account no longer exists. Sign in again to recreate it.',
  account_disabled: 'This account has been disabled.',
};

/**
 * A non-2xx response.
 *
 * `status` lets callers tell the cases apart — 403 means it isn't yours, 404
 * means it isn't there, 409 means the state moved under you. `body` is the
 * server's parsed JSON, so an endpoint answering with something richer than
 * `{ error }` (field-error maps, a `reason` code) can be read without dropping
 * out of `apiFetch` to hand-roll a fetch — which is how a caller used to lose
 * the Authorization header by accident.
 *
 * 401 is deliberately absent from that list: by the time this is thrown the
 * session has already been ended for you. See below.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: ApiErrorBody = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * What a 403 from an owner-gated write means, in one wording, for every one of
 * them. They all answer an unowned artist and an unknown one identically —
 * deliberately, so a caller can't probe which artists exist — so there is
 * exactly one thing to say. It lives here because it belongs to the refusal, not
 * to any one resource; it used to sit in `jams.ts`, which stopped making sense
 * the day jams had no owner writes left.
 */
export const NOT_YOUR_ARTIST = "This wallet doesn't manage that artist.";

// `headers` is narrowed to a plain record so it can be merged rather than
// replaced. The whole-object spread that RequestInit invites would drop
// Content-Type and the bearer token the moment a caller passed a header.
type FetchOptions = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

/**
 * Every call to the Slop Bop API goes through here, authenticated or not — the
 * bearer token is attached whenever there's a session, so no endpoint needs to
 * opt in and none can forget.
 *
 * **Session expiry is handled here, once.** A 401 on a request that carried a
 * token means the session is over, so it's ended centrally and the whole app
 * re-renders signed-out. Feature code is then free to handle only what's
 * specific to it — 403, 404, 409 — instead of each hook re-implementing the
 * same "log out and apologise" branch and the next one forgetting to.
 */
export async function apiFetch<T>(endpoint: string, options?: FetchOptions): Promise<T> {
  const { headers: extra, ...rest } = options ?? {};
  const token = getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'GET',
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    },
  });

  if (!response.ok) {
    const body: ApiErrorBody = await response.json().catch(() => null);

    // Only when we actually sent a token: an anonymous call to a gated route
    // gets `missing_token` too, and ending a session that was never there would
    // put a spurious "you were signed out" on screen.
    //
    // Past that, the *reason* decides — not the status. That's what lets
    // `account_disabled` (a 403) end a session while `auth_not_configured` (a
    // 500) doesn't, and it's why /auth/verify's 401s no longer need a special
    // case: `invalid_signature` simply isn't a session-ending reason.
    if (token) {
      const ended = body?.reason ? SESSION_ENDED[body.reason] : undefined;
      if (ended) signOut(ended);
      // A gated route that answered 401 without a reason predates the reason
      // codes. Treat it the way we always did rather than leaving a dead session.
      else if (response.status === 401 && !body?.reason) {
        signOut('Your session expired. Sign in again to continue.');
      }
    }

    throw new ApiError(
      `${endpoint}: ${body?.error ?? response.statusText}`,
      response.status,
      body,
    );
  }

  return response.json();
}
