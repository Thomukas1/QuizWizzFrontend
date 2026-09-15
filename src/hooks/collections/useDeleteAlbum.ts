import { useState, useRef, useCallback } from 'react';
import {
  deleteAlbum,
  ApiError,
  NOT_YOUR_ARTIST,
  type AlbumDeletionResult,
} from '../../services/slopbop';

/**
 *   conflict (409)  it's already released, and released albums are permanent.
 *   forbidden (403) this wallet doesn't manage the artist.
 *   expired (401)   the session ran out; `apiFetch` has already ended it.
 *
 * A 404 lands in `error` on purpose: an album that isn't there is, from the
 * caller's side, the outcome it asked for — but the screen it was on is gone,
 * so it should navigate away rather than report success.
 */
export type AlbumDeletionOutcome =
  | { ok: true; result: AlbumDeletionResult }
  | { ok: false; kind: 'conflict' | 'forbidden' | 'expired' | 'error'; message: string };

/**
 * Scrap an unreleased album.
 *
 * **Irreversible, and it takes more than the album**: every track already
 * recorded into it is deleted, and every track still queued at the studio is
 * cancelled. `AlbumDeletionResult` reports both counts after the fact — say them
 * *before* it, in a confirm dialog. This hook does not confirm anything.
 *
 * It's also the only exit from a stuck album, and so the only way to start a
 * different one: while an unfinished album exists, creating another 409s.
 *
 * The in-flight guard matters more here than elsewhere. A second delete would
 * 404 rather than destroy anything extra, but it would report as a failure for
 * work that had just succeeded.
 */
export function useDeleteAlbum() {
  const [deleting, setDeleting] = useState(false);
  const inFlight = useRef(false);

  const remove = useCallback(async (albumId: string): Promise<AlbumDeletionOutcome> => {
    if (inFlight.current) {
      return { ok: false, kind: 'error', message: 'Already deleting that album.' };
    }
    inFlight.current = true;
    setDeleting(true);
    try {
      return { ok: true, result: await deleteAlbum(albumId) };
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          return {
            ok: false,
            kind: 'conflict',
            message: (err.body?.error as string) ?? 'A released album can’t be deleted.',
          };
        }
        if (err.status === 403) return { ok: false, kind: 'forbidden', message: NOT_YOUR_ARTIST };
        if (err.status === 401) {
          return {
            ok: false,
            kind: 'expired',
            message: 'Your session expired. Sign in again to delete the album.',
          };
        }
      }
      return { ok: false, kind: 'error', message: 'Could not delete the album. Try again.' };
    } finally {
      inFlight.current = false;
      setDeleting(false);
    }
  }, []);

  return { remove, deleting };
}
