import { apiFetch } from './client';

/**
 * The album's own surface: the three writes only the artist who owns it can
 * make. Reads stay generic — an album is fetched with `fetchCollection` like any
 * other collection.
 *
 * An album is the one collection the artist authors themselves, and it is built
 * in three acts rather than one call:
 *
 *   1. create   `createAlbum` — title, cover, capacity. The album exists empty.
 *   2. fill     `useSubmitSongRequest`, once per track, until `submission_count`
 *               reaches `max_tracks`. No album-specific endpoint and no
 *               album-specific hook: an album is a collection whose
 *               `request_status.submitters` says `owner`, which the shared
 *               submit path reads to post through the signed door.
 *   3. release  `releaseAlbum` — stamps `released_at` and the album is public.
 *
 * `deleteAlbum` is the only way back out of that, and only before release.
 *
 * **An artist may have one unfinished album at a time.** That's the rule behind
 * the 409 on create, which hands back the existing album's id so a caller can
 * link to it instead of merely reporting the collision.
 *
 * Every call is owner-gated; `apiFetch` attaches the bearer token and handles 401
 * centrally. A 403 means this wallet doesn't manage the artist — an artist that
 * doesn't exist answers identically, so a caller can't probe which exist.
 */

/* ------------------------------------------------------------------ *
 * Validation
 *
 * The server is the trust boundary and re-checks all of this. These
 * mirror its rules so a form can refuse locally instead of spending a
 * round trip to be told the title is empty.
 * ------------------------------------------------------------------ */

export const ALBUM_TITLE_MAX = 60;
export const ALBUM_TRACKS_MIN = 6;
export const ALBUM_TRACKS_MAX = 15;

/**
 * What a new album is made of. Everything here is authored — unlike a jam, where
 * the server derives the lot — so all four fields are the form's to get right.
 *
 * **`cover_url` must already be hosted.** Creation stores a link; it does not
 * upload, and it will not take a `data:` URI. The image comes from the visuals
 * flow: render a draft, *save* it (which is what uploads to Arweave), then pass
 * the resulting `SavedImage.url` here. An unsaved `Draft` carries inline bytes
 * and is not a candidate.
 */
export interface AlbumDraft {
  artist_id: string;
  title: string;
  cover_url: string;
  max_tracks: number;
}

/**
 * Field → message, empty when the draft is sendable. Keys match `AlbumDraft`, so
 * a form can map them straight onto its inputs — the same shape a 400 from the
 * submission endpoints returns, deliberately.
 */
export function validateAlbumDraft(draft: Partial<AlbumDraft>): Record<string, string> {
  const errors: Record<string, string> = {};

  const title = draft.title?.trim() ?? '';
  if (!title) errors.title = 'Give the album a title';
  else if (title.length > ALBUM_TITLE_MAX) {
    errors.title = `Keep the title to ${ALBUM_TITLE_MAX} characters`;
  }

  const cover = draft.cover_url?.trim() ?? '';
  if (!cover) errors.cover_url = 'Pick a cover';
  else if (!/^https?:\/\//i.test(cover)) {
    // The realistic way to land here is passing a draft's inline `image_data`
    // instead of a saved image's url — i.e. the image was never uploaded.
    errors.cover_url = 'Save the cover image first, then use it here';
  }

  const tracks = draft.max_tracks;
  if (tracks === undefined || !Number.isInteger(tracks)) {
    errors.max_tracks = 'Choose how many tracks';
  } else if (tracks < ALBUM_TRACKS_MIN || tracks > ALBUM_TRACKS_MAX) {
    errors.max_tracks = `An album runs ${ALBUM_TRACKS_MIN}–${ALBUM_TRACKS_MAX} tracks`;
  }

  return errors;
}

/* ------------------------------------------------------------------ *
 * The three writes
 * ------------------------------------------------------------------ */

/** What the server stored for an album it just created. */
export interface CreatedAlbum {
  collection_id: string;
  title: string;
  cover_url: string;
  max_tracks: number;
}

/** What releasing an album did. `released_at` is the date it now displays. */
export interface AlbumReleaseResult {
  collection_id: string;
  released_at: string;
}

/** What deleting an album took with it. */
export interface AlbumDeletionResult {
  collection_id: string;
  /** Tracks already recorded into the album. */
  deleted_songs: number;
  /** Tracks still queued at the studio — orders cancelled, not just unlinked. */
  deleted_requests: number;
}

interface CreateAlbumResponse extends CreatedAlbum {
  success: boolean;
}

interface ReleaseResponse extends AlbumReleaseResult {
  success: boolean;
}

interface DeleteResponse extends AlbumDeletionResult {
  success: boolean;
}

/**
 * Start an album for an artist this wallet owns. Fast and cheap — it stores a
 * link, it doesn't render or upload anything.
 *
 * Errors worth telling apart, by `ApiError.status`:
 *   400  a field is wrong — `body.error` says which. `validateAlbumDraft`
 *        should have caught it first.
 *   403  this wallet doesn't manage that artist
 *   409  this artist already has an unfinished album. `body.collection_id` is
 *        that album — link to it. There is no second one to be had, and no way
 *        past it except finishing or deleting the one that exists.
 *
 * `useCreateAlbum` turns those into a discriminated outcome; prefer it over
 * catching here.
 */
export const createAlbum = (draft: AlbumDraft) =>
  apiFetch<CreateAlbumResponse>('/slopbop/collections/albums', {
    method: 'POST',
    body: JSON.stringify({
      artist_id: draft.artist_id,
      title: draft.title.trim(),
      cover_url: draft.cover_url.trim(),
      max_tracks: draft.max_tracks,
    }),
  }).then(r => ({
    collection_id: r.collection_id,
    title: r.title,
    cover_url: r.cover_url,
    max_tracks: r.max_tracks,
  }));

/**
 * Publish a full album. One-way — an album has no unrelease — but not
 * destructive: nothing is removed, a date is stamped.
 *
 * Only worth offering when the album is actually full; the server refuses
 * otherwise. 409 covers both refusals with two distinct messages ("already
 * released" and "not full yet"), so surface `ApiError.body.error` rather than a
 * wording of our own, and refetch — either way the album on screen is stale.
 */
export const releaseAlbum = (collectionId: string) =>
  apiFetch<ReleaseResponse>(`/slopbop/collections/albums/${collectionId}/release`, {
    method: 'POST',
  }).then(r => ({ collection_id: r.collection_id, released_at: r.released_at }));

/**
 * Scrap an unreleased album. **Destructive and irreversible**: its recorded
 * tracks are deleted and its queued orders cancelled with it. Confirm before
 * calling — this is not an "archive".
 *
 * It is also the only exit from a stuck album, and therefore the only way to
 * start a different one: while an unfinished album exists, `createAlbum` 409s.
 *
 * 409 means it's already released — released albums are permanent.
 */
export const deleteAlbum = (collectionId: string) =>
  apiFetch<DeleteResponse>(`/slopbop/collections/albums/${collectionId}`, {
    method: 'DELETE',
  }).then(r => ({
    collection_id: r.collection_id,
    deleted_songs: r.deleted_songs,
    deleted_requests: r.deleted_requests,
  }));
