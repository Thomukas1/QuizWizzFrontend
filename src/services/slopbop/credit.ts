import type { Song } from './songs';

/**
 * What resolving a credit needs off an artist. Structural rather than
 * `Pick<Artist, …>` so a caller holding the two fields loose — the profile
 * passes a name that may not have loaded — can ask without assembling an Artist.
 */
interface CreditSource {
  owner_id?: string;
  name?: string;
}

/**
 * Who to credit for a song, resolved rather than read.
 *
 * A song carries one of two credits and never both. `created_by` names the
 * account that wrote it, and the name comes from whatever that id points at —
 * so renaming an artist re-credits their whole catalogue, with no stored copies
 * to go stale. `author` is the fallback, a literal name typed by someone with no
 * account to point at.
 *
 * Today an id only resolves when it's the artist's owner; the audience half
 * waits on user display names, and until then those songs credit nobody. Every
 * consumer already treats an empty credit as "show none".
 */
export function songCredit(song: Song, artist?: CreditSource | null): string {
  if (!song.created_by) return song.author ?? '';
  if (artist?.owner_id && song.created_by === artist.owner_id) return artist.name ?? '';
  return '';
}

/**
 * Whether the artist wrote this song themselves, as opposed to a fan whose seed
 * they picked up. The discography's Original/Community split.
 *
 * Both sides come from the server and the answer decides what to *render*, which
 * is why comparing `owner_id` here is fine where comparing it against the session
 * would not be (see the note on `Artist.owner_id`): the client isn't a party to
 * either value, and nothing is being authorized.
 */
export function isArtistsOwnWork(
  song: Song,
  ownerId?: string,
): boolean {
  return !!ownerId && song.created_by === ownerId;
}
