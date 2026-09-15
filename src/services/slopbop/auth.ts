import { devSigner, signMessageBase58 } from '../solana';
import { apiFetch, ApiError } from './client';
import * as session from './session';
import type { ArtistIdentity } from './artists';

/**
 * Wallet sign-in — the flow, in one place.
 *
 *   challenge → sign locally → verify → token → /auth/me
 *
 * The endpoints below are the wire; `signInWithWallet` is the sequence. It lives
 * here rather than in a hook because none of it is React: the only thing the UI
 * contributes is a `signMessage` function from the wallet adapter, which is
 * passed in. Everything it learns goes straight into the session store, so
 * there's no second copy for a component to hold.
 *
 * The token is a 7-day JWT with no refresh. When it expires — or any authed call
 * comes back 401 — the session is simply over and re-login costs one signature.
 */

export interface VerificationData {
  walletAddress: string;
  challengeId: string;
  /** base58 of the ed25519 signature over the UTF-8 bytes of the challenge message. */
  signature: string;
}

interface ChallengeResponse {
  challengeId: string;
  message: string;
  walletAddress: string;
  /** ISO timestamp. Informational — the server enforces it. */
  expires_at: string;
}

interface VerifyResponse {
  success: boolean;
  token: string;
  expires_in: number;
  wallet: string;
}

interface MeResponse {
  success: boolean;
  /** Who the token belongs to — a Solana public key. Echoes what we sent. */
  user_id: string;
  /**
   * The artists this user controls, as `{ artist_id, name }` and nothing more —
   * enough to name one and link to it. **Empty is a valid, complete answer** — an
   * audience account — not a failed or lesser login. Several is equally valid;
   * don't assume the first element or a length of one.
   */
  artists: ArtistIdentity[];
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * Ask for something to sign. Single-use, 5-minute TTL. A wrong signature no
 * longer burns it — the server counts attempts and only spends the challenge on
 * success or at its cap — so asking for a fresh one per attempt is a choice, not
 * a requirement. We do anyway: it costs one request, keeps this flow stateless,
 * and the server evicts a wallet's oldest challenges past a cap of its own.
 */
export const getChallenge = (walletAddress: string) =>
  apiFetch<ChallengeResponse>('/slopbop/auth/challenge', {
    method: 'POST',
    body: JSON.stringify({ walletAddress }),
  });

/** Trade a signed challenge for a session token. 401 carries a `reason`. */
export const verifyWallet = (data: VerificationData) =>
  apiFetch<VerifyResponse>('/slopbop/auth/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  });

/** Who the current token belongs to, and what it controls. 401 = session over. */
export const fetchMe = () => apiFetch<MeResponse>('/slopbop/auth/me');

/**
 * Revoke the session row this token names. Takes the token explicitly rather than
 * reading the store, because the caller has already cleared it — see `endSession`.
 */
const revokeSession = (token: string) =>
  apiFetch<{ success: boolean }>('/slopbop/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

/**
 * One device this wallet is signed in on. `jti` names a session so it can be
 * pointed at; it is not a credential, which is why showing someone their own is
 * safe.
 */
export interface SessionInfo {
  jti: string;
  issued_at: string;
  expires_at: string;
  last_seen_at: string;
  user_agent?: string;
  /** The session this request arrived on. */
  current: boolean;
}

interface SessionsResponse {
  success: boolean;
  sessions: SessionInfo[];
}

/** Where this wallet is signed in, newest first. The read behind a devices screen. */
export const listSessions = () =>
  apiFetch<SessionsResponse>('/slopbop/auth/sessions').then(r => r.sessions);

/**
 * End every session this wallet holds, including this one — the "I lost a phone"
 * action. Clears locally too, since this one is among the revoked.
 */
export async function endAllSessions(): Promise<number> {
  try {
    const { revoked } = await apiFetch<{ success: boolean; revoked: number }>(
      '/slopbop/auth/logout-all',
      { method: 'POST' },
    );
    return revoked;
  } finally {
    // Unlike `endSession`, this one awaits first: the count is the answer, and
    // dropping the token before the call would leave nothing to authenticate it.
    session.signOut();
  }
}

// ---------------------------------------------------------------------------
// Flows — the only things that write to the session store
// ---------------------------------------------------------------------------

/**
 * Prove a wallet and start a session. Prompts the wallet exactly once.
 *
 * Resolves when the session is live, rejects when it isn't; either way the store
 * already reflects the outcome, so a caller that only renders from the store can
 * ignore both. It rejects rather than swallowing so a caller who *does* need to
 * sequence something after a successful sign-in can await it.
 */
export async function signInWithWallet(
  walletAddress: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<void> {
  session.beginSignIn();
  try {
    // A fresh challenge every attempt — they're single-use with a 5-minute TTL
    // and a failed verify spends one, so retrying an old id can only fail.
    const { challengeId, message } = await getChallenge(walletAddress);

    // The message isn't sent back: the server verifies against its stored copy,
    // so an echo could only ever agree or disagree with it. The signature's wire
    // format is `services/solana`'s business.
    const signature = await signMessageBase58(signMessage, message);

    const { token, expires_in } = await verifyWallet({
      walletAddress,
      challengeId,
      signature,
    });
    session.setCredentials(walletAddress, token, expires_in);

    // Signed in the moment the token lands; what they control is a second,
    // non-fatal question — see refreshAccount.
    await refreshAccount();
    session.endSignIn();
  } catch (err) {
    session.signOut(messageFor(err));
    throw err;
  }
}

/**
 * Reload which artists the session controls. Called after sign-in and on boot
 * from a restored token.
 *
 * A failure here is not a failed session: the token is good, we just don't know
 * the artist list yet. A 401 is the exception, and `apiFetch` has already ended
 * the session by the time this sees it — hence no 401 branch.
 */
export async function refreshAccount(): Promise<void> {
  const me = await fetchMe();
  session.setArtists(me.artists);
}

/**
 * `refreshAccount` with `loading` raised around it, so a page that routes on the
 * artist list can tell "audience account" from "haven't asked yet". Without it an
 * owner reloading flashes the audience view before redirecting.
 */
async function restoreAccount(): Promise<void> {
  session.beginSignIn();
  try {
    await refreshAccount();
  } finally {
    session.endSignIn();
  }
}

/**
 * Called once on boot. Restores a stored session, or in dev signs in from
 * `VITE_DEV_WALLET_KEY` with no wallet, no extension and no popup — which is what
 * makes the app usable in an embedded browser.
 *
 * **The dev key outranks a stored session naming a different wallet.** Otherwise
 * whoever signed in last is pinned in `localStorage` and changing the key does
 * nothing until you clear storage by hand. A stored session for the *same* wallet
 * is kept, so a reload costs no signature.
 */
export async function bootSession(): Promise<void> {
  const signer = devSigner();
  if (signer && session.getUserId() !== signer.address) {
    await signInWithWallet(signer.address, signer.signMessage);
    return;
  }
  if (session.getUserId()) await restoreAccount();
}

/**
 * Sign out. Clears locally **first** so the UI updates on the spot, then revokes
 * the row in the background — sessions are rows now, and a token dropped only on
 * the client keeps working until its TTL.
 *
 * The revoke is deliberately not awaited and its failure is swallowed: someone
 * who pressed sign-out is signed out whether or not the network agreed, and the
 * row expires on its own if the request never lands. Awaiting it would put a
 * network round-trip between the tap and the screen changing.
 */
export function endSession(): void {
  const token = session.getToken();
  session.signOut();
  if (token) void revokeSession(token).catch(() => {});
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    // 500 on an otherwise-working backend means JWT_SECRET isn't set server-side.
    if (err.status >= 500) return 'Sign-in is unavailable right now. Try again later.';
    if (err.status === 401) return 'Signature check failed. Try signing in again.';
  }
  // Wallet adapters reject with their own errors when the user dismisses the prompt.
  if (err instanceof Error && /reject|denied|cancel/i.test(err.message)) {
    return 'Signature request was cancelled.';
  }
  return 'Could not sign in with this wallet.';
}
