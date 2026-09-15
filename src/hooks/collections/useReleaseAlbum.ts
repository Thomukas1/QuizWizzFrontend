import { useState, useRef, useCallback } from 'react';
import {
  releaseAlbum,
  ApiError,
  NOT_YOUR_ARTIST,
  type AlbumReleaseResult,
} from '../../services/slopbop';

/**
 *   conflict (409)  the album isn't releasable — either it's already out or it
 *                   isn't full yet. The server distinguishes the two in its own
 *                   words and this passes them through, because both mean the
 *                   same thing to the caller: refetch, the screen is stale.
 *   forbidden (403) this wallet doesn't manage the artist.
 *   expired (401)   the session ran out; `apiFetch` has already ended it.
 */
export type AlbumReleaseOutcome =
  | { ok: true; result: AlbumReleaseResult }
  | { ok: false; kind: 'conflict' | 'forbidden' | 'expired' | 'error'; message: string };

/**
 * Publish a full album.
 *
 * One-way — there is no unrelease — but not destructive: it stamps `released_at`
 * and nothing is lost, so this is a confirm-worthy action rather than a
 * dangerous one (`useDeleteAlbum` is the dangerous one).
 *
 * Offer it only when the album is full (`released_at === null &&
 * submission_count >= max_tracks`); the server refuses otherwise and the
 * refusal is the 409 above.
 */
export function useReleaseAlbum() {
  const [releasing, setReleasing] = useState(false);
  const inFlight = useRef(false);

  const release = useCallback(async (albumId: string): Promise<AlbumReleaseOutcome> => {
    if (inFlight.current) {
      return { ok: false, kind: 'error', message: 'Already releasing that album.' };
    }
    inFlight.current = true;
    setReleasing(true);
    try {
      return { ok: true, result: await releaseAlbum(albumId) };
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          return {
            ok: false,
            kind: 'conflict',
            // The server's wording, not ours: it's the only thing that knows
            // which of the two refusals this is.
            message: (err.body?.error as string) ?? 'This album can’t be released yet.',
          };
        }
        if (err.status === 403) return { ok: false, kind: 'forbidden', message: NOT_YOUR_ARTIST };
        if (err.status === 401) {
          return {
            ok: false,
            kind: 'expired',
            message: 'Your session expired. Sign in again to release the album.',
          };
        }
      }
      return { ok: false, kind: 'error', message: 'Could not release the album. Try again.' };
    } finally {
      inFlight.current = false;
      setReleasing(false);
    }
  }, []);

  return { release, releasing };
}
