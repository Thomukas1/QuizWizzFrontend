import { apiFetch, ApiError } from './client';
import { RequestStatus } from './collections';

// A song submission against a collection. The collection id travels in the URL,
// not the body. Wire format mirrors the backend's validation rules (in comments
// only — the backend is the trust boundary). `text` preserves internal line
// breaks (server normalizes \r\n / \r → \n and trims only the outer edges).
export interface SongRequestPayload {
  author: string; // required, ≤ 18 chars (trimmed)
  text: string;   // required, ≤ 260 chars
}

/**
 * The signed door's body — no name in it. Anyone with an account submits this
 * way, artist or audience; the server credits the account itself, so a name here
 * would be a stale copy at best and a forgery at worst. It isn't sent, and
 * wouldn't be believed.
 */
export interface SignedSongRequestPayload {
  text: string;   // required, ≤ 260 chars
}

// Returned on a successful 201. The submit endpoint also echoes the freshly
// re-evaluated window so the caller can update the capacity gauge without a
// separate refetch.
export interface SongRequestResult {
  request_id: string;
  request_status: RequestStatus;
}

// Why a collection isn't accepting submissions. Shared by the collection
// detail's `request_status.reason` and the submit endpoint's 409 body.
export type RequestClosedReason =
  | 'not_started'     // before submission_start (both crowdsourced types — a jam
                      // can be scheduled ahead of its own opening now)
  | 'deadline_passed' // past submission_deadline (both crowdsourced types)
  | 'full'      // submission_count reached max_tracks
  | 'not_configured'  // max_tracks never authored
  // Legacy: the collection's type takes no submissions at all. It used to mean
  // "this is an album", back when an album took none from anyone; an album now
  // fills through the signed door, and a closed one reads `full` like the rest.
  // Kept because it's the backend's wire value and nothing here branches on it.
  | 'not_an_album';

// Discriminated outcome of submit:
//   ok         → the new request id + the updated window
//   validation → field→message map from a 400 (same shape as the application form)
//   closed     → the window closed server-side between load and submit (409); the
//                caller should surface the message and refresh the collection
//   forbidden  → this door isn't open to whoever asked (403). On a collection
//                whose `submitters` is `owner`, that's anyone but the artist —
//                including a signed-in fan, and including the artist themselves
//                if they came through the anonymous door.
// A 404 (collection not found), 500, or network error rejects.
//
// 403 is in the union rather than thrown because it's an ordinary answer this
// endpoint gives, not an exception: leaving it out is what forced an album-only
// submit hook to exist, wrapping the shared one in a try/catch to catch the one
// case the union didn't cover.
export type SongRequestOutcome =
  | { ok: true; data: SongRequestResult }
  | { ok: false; kind: 'validation'; errors: Record<string, string> }
  | { ok: false; kind: 'closed'; reason: RequestClosedReason; message: string }
  | { ok: false; kind: 'forbidden'; message: string };

// POST a song submission. Shared by both doors, which differ only in their path
// and their body — the failures are identical.
//
// Goes through `apiFetch` like everything else. It used to hand-roll its own
// fetch to get at the 400/409 bodies, which also meant it silently sent no
// Authorization header — harmless while submissions are public, and a trap the
// moment they aren't. `ApiError.body` carries those bodies now, so the outcome
// below is built from a caught error rather than from a raw response.
async function postSubmission(
  path: string,
  payload: SongRequestPayload | SignedSongRequestPayload,
): Promise<SongRequestOutcome> {
  try {
    const data = await apiFetch<SongRequestResult>(
      path,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    return {
      ok: true,
      data: { request_id: data.request_id, request_status: data.request_status },
    };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 400) {
        return {
          ok: false,
          kind: 'validation',
          errors: (err.body?.errors ?? {}) as Record<string, string>,
        };
      }
      if (err.status === 409) {
        return {
          ok: false,
          kind: 'closed',
          reason: err.body?.reason as RequestClosedReason,
          message: err.body?.error || 'Song submissions are closed for this collection',
        };
      }
      if (err.status === 403) {
        return {
          ok: false,
          kind: 'forbidden',
          message: (err.body?.error as string) || 'Only the artist can add to this collection',
        };
      }
    }
    throw err;
  }
}

/**
 * The anonymous door: the typed name is the credit.
 *
 * Only for collections whose `submitters` is `anyone` — an owner-only one 403s
 * here even for its own artist, since this door proves nothing about who's
 * knocking. `useSubmitSongRequest` reads that field and never picks this door
 * when it says otherwise.
 */
export const submitSongRequest = (collectionId: string, payload: SongRequestPayload) =>
  postSubmission(`/slopbop/collections/${collectionId}/submissions`, payload);

/**
 * The signed door, for anyone with an account. `apiFetch` attaches the bearer
 * token on its own, so the path is the only difference: the server credits the
 * account it just verified instead of reading a name off the body.
 *
 * Also the door an album fills through — it's the only one that can prove the
 * submitter is the artist — which is the one case that answers `forbidden`.
 */
export const submitSignedSongRequest = (collectionId: string, payload: SignedSongRequestPayload) =>
  postSubmission(`/slopbop/collections/${collectionId}/submissions/me`, payload);

/* ------------------------------------------------------------------ *
 * The queue
 *
 * Everything the studio has been asked to make is a request, whoever
 * asked: a submitted song, an ordered visual, a mixtape. The endpoint
 * below reads the ones it hasn't finished, which is the only way to know
 * that something is coming — a render in flight is filed nowhere else
 * until it lands.
 * ------------------------------------------------------------------ */

/** What was ordered. Omit it to ask for everything in flight. */
export type RequestType = 'visual' | 'song' | 'mixtape';

/**
 * A work order the studio hasn't finished. Its presence is the whole signal:
 * it appears when the order is accepted and is gone once the studio is done
 * with it, either way — a failed render leaves no trace anywhere, so an empty
 * queue means "no longer coming", not "arrived".
 *
 * `data` is whatever that type of order carries; a visual's is
 * `VisualRequestData`. Generic rather than a union, because the shapes of the
 * other two aren't ours to state until something reads them.
 */
export interface PendingRequest<D = unknown> {
  request_id: string;
  type: RequestType;
  /** Where it is in the pipeline, e.g. `in_progress`. Nothing here branches on it. */
  status: string;
  created_at: string;
  available_at: string | null;
  data: D;
}

/** The `data` on a visual's order — the prompt it's rendering, and at what shape. */
export interface VisualRequestData {
  prompt: string;
  aspect: string;
}

/**
 * What this artist has in flight, newest state of the queue. Owner-gated: 403
 * covers both someone else's artist and an artist that doesn't exist, so a
 * stranger can't tell the two apart.
 *
 * Cheap and idempotent — built to be polled. There's no push, and nothing else
 * answers "is it still coming?".
 */
export const fetchPendingRequests = <D = unknown>(artistId: string, type?: RequestType) =>
  apiFetch<{ success: boolean; requests: PendingRequest<D>[] }>(
    `/slopbop/requests?artist_id=${encodeURIComponent(artistId)}${type ? `&type=${type}` : ''}`,
  ).then(r => r.requests);
