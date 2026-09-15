import { createContext, useCallback, useContext, useEffect, useRef, useSyncExternalStore, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  getSnapshot,
  bootSession,
  endSession,
  signInWithWallet,
  subscribe,
  type ArtistIdentity,
} from '../services/slopbop';

/**
 * The signed-in user, as React sees it.
 *
 * This is a **view onto the session store**, not a second copy of it — the state
 * below is read with `useSyncExternalStore`, so the fetch layer and the UI are
 * looking at the same object. Signing out from a 401 deep inside `apiFetch`
 * re-renders every consumer here without anything having to be told.
 *
 * ── User vs artist ──
 * `isAuthed` means a wallet was proved. That's it, and it's the only thing that
 * should gate "are you allowed to act at all". `artists` — the artists this user
 * controls — is a **separate** fact and is usually empty: most signed-in users
 * are audience. Gating anything on `artists.length` turns an ordinary account
 * into a broken one, which is exactly the bug this replaced.
 *
 * What this deliberately does *not* do is decide whether you own the artist
 * you're looking at. That answer is `is_owner` on the artist's own fetch, so the
 * server stays the one place that decides, rather than the client comparing an
 * owner id against a key it also controls.
 */
export interface Auth {
  /** The signed-in user's id — their Solana public key — or null when signed out. */
  userId: string | null;
  /** A wallet has been proved. Independent of whether they control any artist. */
  isAuthed: boolean;
  /** Artists this user controls — id and name only. Empty is ordinary; several is allowed. */
  artists: ArtistIdentity[];
  /** A sign-in or account refresh is in flight. */
  loading: boolean;
  error: string | null;
  /** Run challenge → sign → verify → /auth/me. Prompts the wallet. */
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, connected } = useWallet();
  const { userId, artists, loading, error } = useSyncExternalStore(subscribe, getSnapshot);

  // Mount-only: restore a stored session, or sign in from the dev key. Reads the
  // store itself rather than `userId`, because keying on identity would fire a
  // second /auth/me for every login — `signInWithWallet` already refreshes.
  useEffect(() => {
    bootSession().catch(() => {
      /* not fatal — a 401 is handled in apiFetch, anything else leaves the
         session intact with an empty artist list, which renders correctly */
    });
  }, []);

  // A token names one user. If the adapter switches to a different address the
  // session no longer describes the person at the keyboard, so end it — and end
  // it server-side, because a row left live is a token that still works.
  useEffect(() => {
    if (!userId || !publicKey) return;
    if (publicKey.toBase58() !== userId) endSession();
  }, [publicKey, userId]);

  // Disconnecting the wallet ends the session too. Guarded on having actually
  // been connected: `connected` is false during autoConnect's startup, and
  // clearing there would throw away a perfectly good restored session.
  const wasConnected = useRef(false);
  useEffect(() => {
    if (connected) {
      wasConnected.current = true;
      return;
    }
    if (wasConnected.current) {
      wasConnected.current = false;
      endSession();
    }
  }, [connected]);

  const login = useCallback(async () => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected or does not support message signing');
    }
    await signInWithWallet(publicKey.toBase58(), signMessage);
  }, [publicKey, signMessage]);

  // Fire-and-forget: the local session is cleared synchronously inside
  // `endSession`, so the UI updates now and the revoke lands when it lands.
  const logout = useCallback(() => endSession(), []);

  const value: Auth = {
    userId,
    isAuthed: userId !== null,
    artists,
    loading,
    error,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
