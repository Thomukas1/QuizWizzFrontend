import { apiFetch } from './client';

export interface Song {
  _id: string;
  artist_id: string;
  collection_id?: string;
  title?: string;
  duration?: number;
  cover_url?: string;
  // Media is withheld until release: an upcoming song (`released: false`) comes
  // through with `audio_url`, `animation_url`, `lyrics` and `note` all null —
  // only the title and cover art are present, for the countdown card. Guard
  // playback/download against the missing audio.
  audio_url?: string;
  animation_url?: string;
  lyrics?: string;
  // The artist's own word on how the song came about, or null for no note. It's
  // model-generated prose the backend stores verbatim — uncapped and
  // unsanitized, so render it as plain text and never as markup. Gate on
  // `note?.trim()`: a whitespace-only note is no note.
  note?: string | null;
  /**
   * The credit, as exactly one of these two — never read `author` directly, use
   * `songCredit` (credit.ts), which knows which one is in play.
   *
   * `created_by` is the `user_id` of the account that wrote the song, and the
   * display name is *resolved* from it: matching the artist's `owner_id` means
   * the artist themselves. Empty means nobody signed in, and only then does
   * `author` — a literal name typed into the submission form — carry the credit.
   *
   * The same comparison sorts a song into the Original or Community half of a
   * discography: a jam winner keeps the empty `created_by` its anonymous seed
   * gave it, even after promotion clears its `collection_id`.
   */
  author?: string;
  created_by?: string;
  caption?: string;
  bpm?: number;
  keyscale?: string;
  lora?: string;
  // Whether the song has dropped. The backend is authoritative here — an
  // upcoming song is `released: false` with a future `release_date` and no
  // media; it flips to `true` (and media populates) at release, so re-fetch to
  // reveal rather than assuming the client already has the audio. See
  // `isReleased`.
  released?: boolean;
  // Real-world release moment as a UTC ISO-8601 "Z" timestamp ("YYYY-MM-DDTHH:MM:SSZ",
  // a Mongo BSON date). The countdown card ticks toward `new Date(release_date)`.
  // Also the catalogue sort key. No longer tied to sim time in any way.
  release_date?: string;
  created_at?: string;
  // How many bops the song has. One-sided by design: there is no counter-vote,
  // so this is both the like count and the only ranking key. Absent on older
  // songs — read it as 0.
  bops?: number;
}

// Whether a song has dropped, per the backend's authoritative `released` flag.
// Upcoming songs arrive as `released: false` (future `release_date`, null media);
// legacy/immediately-published songs omit the flag, so absent counts as released.
// Not-yet-released songs are kept out of play queues and shown as countdown cards.
export function isReleased(song: Song): boolean {
  return song.released !== false;
}

interface SongsResponse {
  success: boolean;
  songs: Song[];
}

interface SongResponse {
  success: boolean;
  song: Song;
}

interface BopResponse {
  success: boolean;
  bops: number;
}

export const fetchSongs = (artistId: string) =>
  apiFetch<SongsResponse>(`/slopbop/songs?artist_id=${artistId}`).then(r => r.songs);

// One song by id. The read for a song you know the id of but can't reach through
// a list — a resolved jam's winner, which has left the collection that named it.
export const fetchSong = (songId: string) =>
  apiFetch<SongResponse>(`/slopbop/songs/${songId}`).then(r => r.song);

// Bop a song — a like, with no counter-vote and no body. Not idempotent and not
// authenticated: the server counts every call, so the caller is responsible for
// only sending one per song (see `useSongBop`). Returns the fresh count.
export const bopSong = (songId: string) =>
  apiFetch<BopResponse>(`/slopbop/songs/${songId}/bop`, {
    method: 'PATCH',
  }).then(r => r.bops);
