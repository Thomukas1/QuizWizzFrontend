import { apiFetch } from './client';

/**
 * The artist's image creator. Two resources, one flow:
 *
 *   POST /slopbop/visuals   orders a render — returns immediately, the studio
 *                           works it whenever the GPU frees up
 *   /slopbop/images         what came back: drafts (unsaved, 24h) and images
 *                           (saved to Arweave, permanent)
 *
 * There is no status endpoint for an order. Orders are disposable — the studio
 * files what it produces as a draft and the order is swept — so "has it landed?"
 * is answered by the drafts list growing, which is what `useImageStudio` polls
 * for. A render that *fails* therefore never appears anywhere; the hook gives up
 * on a timer rather than waiting on a signal that isn't coming.
 *
 * Every call is owner-gated: 403 means this wallet doesn't manage that artist.
 * `apiFetch` attaches the bearer token and handles 401 centrally.
 */

/** Mirrors the server's cap. Enforce it on the input; the server is the trust boundary. */
export const MAX_VISUAL_PROMPT = 300;

/**
 * An unsaved render. Lives 24h, then Mongo sweeps it.
 *
 * `image_data` is a `data:` URI, not a link — render it with
 * `<img src={draft.image_data} />`. It arrives inline precisely because an
 * `<img>` can't send an Authorization header, and these bytes sit behind one.
 */
export interface Draft {
  image_id: string;
  artist_id: string;
  prompt: string;
  /** The shape it was rendered at. Square for everything we order today. */
  aspect: string;
  /** Reproduces this exact render when paired with the prompt. */
  seed: number | null;
  created_at: string;
  expires_at: string | null;
  image_data: string;
}

/** A draft the owner kept. The bytes are on Arweave now, so only the url comes back. */
export interface SavedImage {
  image_id: string;
  artist_id: string;
  prompt: string;
  aspect: string;
  seed: number | null;
  created_at: string;
  url: string;
}

interface CreateVisualResponse {
  success: boolean;
  request_id: string;
}

interface DraftsResponse {
  success: boolean;
  drafts: Draft[];
}

interface ImagesResponse {
  success: boolean;
  images: SavedImage[];
}

interface SaveResponse {
  success: boolean;
  url: string;
}

/**
 * Order one render. Returns the order's id, which is good for nothing but
 * logging — nothing reads an order back. Resolving means the order was accepted,
 * not that an image exists.
 *
 * Always square: the server offers eight aspect ratios and we send none, taking
 * its default. Everything an owner makes is the same shape until there's a
 * reason for it not to be, so there's no aspect to pass or to get wrong.
 *
 * For another go at an existing draft use `rerollDraft` — it reads the prompt
 * off the draft, so there is nothing to re-supply.
 *
 * Cheap and repeatable by design: fire it, throw the result away, fire it again.
 * Nothing server-side stops two at once, so the caller owns the one-at-a-time
 * rule (`useImageStudio` holds that guard).
 *
 * 400 = empty prompt or over `MAX_VISUAL_PROMPT`. 403 = not this wallet's artist.
 */
export const createVisual = (artistId: string, prompt: string) =>
  apiFetch<CreateVisualResponse>('/slopbop/visuals', {
    method: 'POST',
    body: JSON.stringify({ artist_id: artistId, prompt }),
  }).then(r => r.request_id);

/**
 * Another go at a draft's idea, taking its prompt and aspect from the draft
 * itself. The old attempt is deleted — a reroll replaces rather than accumulates
 * — and the server does both in one call, so they can't come apart.
 *
 * Drafts only. 409 means it's already saved; be rid of that with `deleteImage`.
 * 404 means it isn't this artist's draft.
 */
export const rerollDraft = (imageId: string) =>
  apiFetch<CreateVisualResponse>(`/slopbop/images/${imageId}/reroll`, { method: 'POST' })
    .then(r => r.request_id);

/** Unsaved renders, newest first, bytes included. */
export const fetchDrafts = (artistId: string) =>
  apiFetch<DraftsResponse>(`/slopbop/images/drafts?artist_id=${encodeURIComponent(artistId)}`)
    .then(r => r.drafts);

/** Saved images, newest first. */
export const fetchImages = (artistId: string) =>
  apiFetch<ImagesResponse>(`/slopbop/images?artist_id=${encodeURIComponent(artistId)}`)
    .then(r => r.images);

/**
 * Keep a draft: uploads it to Arweave and returns the permanent url. Takes a few
 * seconds — cover it.
 *
 * The draft *becomes* the image, so afterwards it is gone from `fetchDrafts` and
 * present in `fetchImages`; refetch both. Calling it twice is safe: an
 * already-saved draft answers with the url it already has rather than uploading
 * again.
 */
export const saveDraft = (imageId: string) =>
  apiFetch<SaveResponse>(`/slopbop/images/${imageId}/save`, { method: 'POST' })
    .then(r => r.url);

/**
 * Discard one, in either state. A draft goes for good; a saved image loses only
 * its record — the Arweave copy is permanent and any url already handed out
 * keeps working, so this hides it rather than unpublishing it.
 *
 * Not needed for a reroll — `rerollDraft` already removes what it replaces.
 */
export const deleteImage = (imageId: string) =>
  apiFetch<{ success: boolean }>(`/slopbop/images/${imageId}`, { method: 'DELETE' })
    .then(() => undefined);
