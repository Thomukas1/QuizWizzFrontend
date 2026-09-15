import { apiFetch } from './client';

export interface Artist {
  artist_id: string;
  name: string;
  bio?: string;
  image_url?: string;
  socials?: Record<string, string>;
  gender?: string;
  nationality?: string;
  genres?: string[];
  zodiac_sign?: string;
  /**
   * The `user_id` of the user who controls this artist — a Solana public key.
   * Absent on unclaimed artists. Informational only: never compare it against
   * the session to decide what to render, since the client owns both sides of
   * that comparison. `is_owner` below is the server's answer.
   */
  owner_id?: string;
}

/**
 * Just enough to name an artist and link to one. What `/auth/me` returns for the
 * artists a session controls, and deliberately **not** an `Artist`: the full
 * document is live simulator state, so anything holding a copy of it holds one
 * that drifts. Fetch `/slopbop/artists/:id` for the real thing — that's always
 * current, and it's the only answer that carries `is_owner`.
 */
export interface ArtistIdentity {
  artist_id: string;
  name: string;
}

/**
 * Whether an artist is signed to the label — someone controls it. Guest artists
 * have no owner and are driven by hand inside the project, so anything public
 * facing the audience filters with this. Not a permission: it decides what we
 * put on show, not what anyone may do.
 */
export const isSigned = (a: Artist) => Boolean(a.owner_id?.trim());

interface ArtistResponse {
  success: boolean;
  artist: Artist;
  /**
   * Whether the bearer token on the request owns this artist. The route takes
   * the token as optional and never rejects — anonymous, expired, and malformed
   * tokens all get a 200 with `false` — so this is a rendering hint only, never
   * a permission. Forging it just draws buttons.
   */
  is_owner: boolean;
}

interface ArtistsResponse {
  success: boolean;
  artists: Record<string, Artist>;
}

/**
 * The editable half of an artist, as the backend's field registry defines it.
 * Every key is optional and **absent means untouched** — send only what was
 * edited, so a form that never showed a field can't blank it. `''` is the
 * explicit clear. An unknown key is a 400, not a silent no-op, so this type
 * has to stay in step with the registry rather than being a loose Partial.
 */
export interface ArtistUpdate {
  /** Trimmed server-side, max 300 characters. */
  bio?: string;
  /** Trimmed server-side, must be an http(s) URL. `''` clears it. */
  image_url?: string;
}

/**
 * Response to the PATCH. Deliberately not `ArtistResponse`: the write answers
 * with the artist alone and no `is_owner` — it only succeeded because you own
 * it, and claiming the field here would invent one.
 */
interface UpdateArtistResponse {
  success: boolean;
  artist: Artist;
}

export const fetchArtist = (id: string) =>
  apiFetch<ArtistResponse>(`/slopbop/artists/${id}`)
    .then(r => ({ artist: r.artist, isOwner: r.is_owner }));

/**
 * Write the fields an owner edited. Ownership is filtered in the query, so a
 * wallet that doesn't control this artist writes nothing and gets a 403 — the
 * same answer a nonexistent artist gives.
 *
 * Resolves to the full updated doc, the same shape `fetchArtist` reads, so the
 * caller can drop it straight into the state it already holds. An empty patch
 * is a legal no-op that still returns the artist, which is what lets "save" be
 * one unconditional call.
 */
export const updateArtist = (id: string, patch: ArtistUpdate) =>
  apiFetch<UpdateArtistResponse>(`/slopbop/artists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then(r => r.artist);

export const fetchArtists = (limit?: number) => {
  const params = limit ? `?limit=${limit}` : '';
  return apiFetch<ArtistsResponse>(`/slopbop/artists${params}`).then(r => r.artists);
};
