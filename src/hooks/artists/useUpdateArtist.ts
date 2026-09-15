import { useState, useRef, useCallback } from 'react';
import {
  updateArtist,
  ApiError,
  NOT_YOUR_ARTIST,
  type Artist,
  type ArtistUpdate,
} from '../../services/slopbop';

/**
 * Edit an artist the session controls. Command-shaped: one action, its in-flight
 * flag, and the last error.
 *
 * `saving` drives the button; the `inFlight` ref is the guard. The write itself
 * is idempotent — the same patch twice lands the same document — so this is only
 * about not firing a second request while the first is out.
 *
 * Resolves to the full updated artist, or null on failure with `error` set. A
 * suppressed double-fire is also null: the first call is still running and will
 * deliver the artist.
 *
 * A 401 has already ended the session inside `apiFetch` by the time it lands
 * here, so this only speaks to what's specific to editing a profile.
 */
export function useUpdateArtist() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const save = useCallback(
    async (artistId: string, patch: ArtistUpdate): Promise<Artist | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setSaving(true);
      setError(null);
      try {
        return await updateArtist(artistId, patch);
      } catch (err) {
        setError(messageFor(err));
        return null;
      } finally {
        inFlight.current = false;
        setSaving(false);
      }
    },
    [],
  );

  return { save, saving, error };
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    // 400 is the field registry rejecting a value (too long, not a URL) or an
    // unknown key. The server writes those for a person to read, so show it.
    if (err.status === 400 && typeof err.body?.error === 'string') return err.body.error;
    if (err.status === 403) return NOT_YOUR_ARTIST;
    // The session is already gone by now — this only names what was lost.
    if (err.status === 401) return 'Your session expired. Sign in again to edit your profile.';
  }
  return 'Could not save your profile. Try again.';
}
