import { useState, useRef, useCallback } from 'react';
import {
  createAlbum,
  validateAlbumDraft,
  ApiError,
  NOT_YOUR_ARTIST,
  type AlbumDraft,
  type CreatedAlbum,
} from '../../services/slopbop';

/**
 * Discriminated because the caller has to *do* different things with these:
 *
 *   invalid (400)    a field is wrong. `errors` maps onto the form's inputs;
 *                    it's also what a local `validateAlbumDraft` failure returns,
 *                    so the form has one path for both.
 *   existing (409)   this artist already has an unfinished album, and `albumId`
 *                    is it. **Link there** — the message alone leaves someone
 *                    stuck, since there is no second album to be had and the
 *                    only alternatives are finishing that one or deleting it.
 *   forbidden (403)  this wallet doesn't manage the artist. `is_owner` is a
 *                    rendering hint, so this is the real answer arriving late.
 *   expired (401)    `apiFetch` has already ended the session and the app is
 *                    re-rendering signed-out; this only names what happened.
 */
export type AlbumCreateOutcome =
  | { ok: true; album: CreatedAlbum }
  | { ok: false; kind: 'invalid'; errors: Record<string, string> }
  | { ok: false; kind: 'existing'; albumId: string; message: string }
  | { ok: false; kind: 'forbidden' | 'expired' | 'error'; message: string };

/**
 * Create an album for an artist the session controls. Command-shaped: one
 * action, its in-flight flag, and the field errors the form draws.
 *
 * The draft is validated locally first, so an empty title costs no round trip;
 * the server re-checks regardless and its 400 lands in the same `errors` shape.
 *
 * Guarded against a double-fire. Creation is cheap — it stores a cover url
 * rather than rendering one — but it isn't idempotent: the second call doesn't
 * make a second album, it comes back as
 * `existing` pointing at the one the first call just made, which reads as an
 * error for something that in fact worked.
 *
 * No `error` string is returned alongside the outcome. The 409 needs an id and
 * the 400 needs a field map, so a flattened copy would be a second version of
 * the same answer that the caller has to remember not to trust.
 */
export function useCreateAlbum() {
  const [creating, setCreating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(false);

  const create = useCallback(async (draft: AlbumDraft): Promise<AlbumCreateOutcome> => {
    if (inFlight.current) {
      return { ok: false, kind: 'error', message: 'Already creating that album.' };
    }

    const local = validateAlbumDraft(draft);
    if (Object.keys(local).length) {
      setFieldErrors(local);
      return { ok: false, kind: 'invalid', errors: local };
    }

    inFlight.current = true;
    setCreating(true);
    setFieldErrors({});
    try {
      return { ok: true, album: await createAlbum(draft) };
    } catch (err) {
      const outcome = outcomeFor(err);
      if (!outcome.ok && outcome.kind === 'invalid') setFieldErrors(outcome.errors);
      return outcome;
    } finally {
      inFlight.current = false;
      setCreating(false);
    }
  }, []);

  return { create, creating, fieldErrors };
}

function outcomeFor(err: unknown): AlbumCreateOutcome {
  if (err instanceof ApiError) {
    if (err.status === 400) {
      // One message, not a field map — the endpoint answers with the first
      // thing it found wrong. Filed under the field it names where that's
      // legible, and against the form as a whole otherwise.
      const message = (err.body?.error as string) ?? 'Check the album details.';
      return { ok: false, kind: 'invalid', errors: { [fieldFor(message)]: message } };
    }
    if (err.status === 409) {
      const albumId = err.body?.collection_id as string | undefined;
      const message = (err.body?.error as string)
        ?? 'This artist already has an album in progress.';
      // Without the id there's nowhere to send anyone, so it degrades to a plain
      // failure rather than a link to nothing.
      if (albumId) return { ok: false, kind: 'existing', albumId, message };
      return { ok: false, kind: 'error', message };
    }
    if (err.status === 403) return { ok: false, kind: 'forbidden', message: NOT_YOUR_ARTIST };
    if (err.status === 401) {
      return {
        ok: false,
        kind: 'expired',
        message: 'Your session expired. Sign in again to start an album.',
      };
    }
  }
  return { ok: false, kind: 'error', message: 'Could not start the album. Try again.' };
}

/** Which input to hang a server message under. Falls back to the whole form. */
function fieldFor(message: string): string {
  const text = message.toLowerCase();
  if (text.includes('title')) return 'title';
  if (text.includes('cover')) return 'cover_url';
  if (text.includes('track')) return 'max_tracks';
  return 'form';
}
