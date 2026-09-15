import type { ArtistIdentity } from './artists';

/**
 * **The signed-in user. One copy, app-wide.**
 *
 * Everything about who the caller is lives here and nowhere else: the bearer
 * token, the user they are, the artists they control, and whether a sign-in is
 * in flight. `apiFetch` reads the token from here; React reads the rest from
 * here through `useSyncExternalStore`. Nothing mirrors it into component state,
 * which is the whole point — a mirrored copy is a copy that can disagree.
 *
 * It's an observable rather than a context so that non-React code (the fetch
 * layer) and React can share one truth. Mutating it notifies both.
 *
 * ── The model ──
 * A **user** is anyone who proved a wallet. Their `user_id` *is* that public
 * key. Controlling an artist is a separate fact layered on top: `artists` is
 * usually empty, and an empty list is an ordinary audience account, not a
 * half-finished login. Treat `userId !== null` as "signed in" and never
 * `artists.length > 0`.
 *
 * This file holds state and performs no I/O — the challenge/sign/verify flow
 * that fills it lives in `auth.ts`, which is allowed to import this. Keeping the
 * dependency one-way is what stops `client.ts` and `auth.ts` forming a cycle.
 */

const STORAGE_KEY = 'slopbop.session';

/** What React renders from. Flat on purpose: every field answers a question the UI asks. */
export interface SessionSnapshot {
  /** The signed-in user's id — their Solana public key — or null when signed out. */
  userId: string | null;
  /** Artists this user controls. Empty is the common case; see the note above. */
  artists: ArtistIdentity[];
  /** A sign-in or account refresh is in flight. */
  loading: boolean;
  /** Human-readable failure from the last sign-in attempt, cleared when one starts. */
  error: string | null;
}

/**
 * The persisted half. The token alone isn't enough: a JWT names the user it was
 * issued to, so a stale token from a previously connected wallet would let
 * /auth/me answer happily *for the wrong person*. Storing the id beside it lets
 * the adapter-reconciliation check notice the mismatch and drop the session.
 */
interface StoredCredentials {
  userId: string;
  token: string;
  /** Epoch ms the token stops being accepted. */
  expiresAt: number;
}

let credentials: StoredCredentials | null = readStored();
let artists: ArtistIdentity[] = [];
let loading = false;
let error: string | null = null;

const listeners = new Set<() => void>();

// useSyncExternalStore compares snapshots by identity and re-renders on every
// change of it — so this must be rebuilt on mutation and *only* on mutation.
// Returning a fresh object from getSnapshot() would loop forever.
let snapshot: SessionSnapshot = buildSnapshot();

function buildSnapshot(): SessionSnapshot {
  return { userId: credentials?.userId ?? null, artists, loading, error };
}

function emit() {
  snapshot = buildSnapshot();
  for (const listener of listeners) listener();
}

function readStored(): StoredCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCredentials>;
    if (!parsed.userId || !parsed.token || !parsed.expiresAt) return null;
    // A session restored past its expiry is just a signed-out one.
    if (Date.now() >= parsed.expiresAt) return null;
    return { userId: parsed.userId, token: parsed.token, expiresAt: parsed.expiresAt };
  } catch {
    // Unparseable, or storage is blocked (Safari private mode). Either way: signed out.
    return null;
  }
}

function persist() {
  try {
    if (credentials) localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked — the session still works, it just won't survive a reload.
  }
}

// The token dies on a schedule the server already decided, so the UI should stop
// claiming to be signed in at that exact moment rather than at the next request
// that happens to 401. Cleared and re-armed with every credential change.
let expiryTimer: ReturnType<typeof setTimeout> | undefined;

function armExpiry() {
  clearTimeout(expiryTimer);
  if (!credentials) return;
  const ms = credentials.expiresAt - Date.now();
  if (ms <= 0) {
    signOut();
    return;
  }
  // setTimeout saturates past ~24.9 days; a 7-day TTL is well inside that.
  expiryTimer = setTimeout(() => signOut(), ms);
}

armExpiry();

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): SessionSnapshot {
  return snapshot;
}

/**
 * The bearer token for the fetch layer, or null when signed out. A plain read
 * with no side effects — expiry is handled by the timer above, so this never
 * mutates anything on the way past.
 */
export function getToken(): string | null {
  return credentials?.token ?? null;
}

/** The signed-in user's id, for non-React callers. React should read the snapshot. */
export function getUserId(): string | null {
  return credentials?.userId ?? null;
}

// ---------------------------------------------------------------------------
// Writing — the only mutators. Every one of them ends in emit().
// ---------------------------------------------------------------------------

/** A sign-in attempt started: shows a spinner and clears the previous failure. */
export function beginSignIn() {
  loading = true;
  error = null;
  emit();
}

/** A signature was accepted. `expiresIn` is `expires_in` from /auth/verify, in seconds. */
export function setCredentials(userId: string, token: string, expiresIn: number) {
  credentials = { userId, token, expiresAt: Date.now() + expiresIn * 1000 };
  persist();
  armExpiry();
  emit();
}

/** The account read landed — which artists, if any, this user controls. */
export function setArtists(next: ArtistIdentity[]) {
  artists = next;
  emit();
}

export function endSignIn(message: string | null = null) {
  loading = false;
  error = message;
  emit();
}

/**
 * End the session. Used for an explicit sign-out, for the expiry timer, and by
 * `apiFetch` when the server rejects a token we were still holding — which is
 * the case that used to be handled (or forgotten) call site by call site.
 */
export function signOut(message: string | null = null) {
  clearTimeout(expiryTimer);
  credentials = null;
  artists = [];
  loading = false;
  error = message;
  persist();
  emit();
}
