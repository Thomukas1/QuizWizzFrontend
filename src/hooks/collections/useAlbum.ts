import { useResource } from '../useResource';
import { fetchCollection, Song } from '../../services/slopbop';
import { useToast } from '../../context/ToastContext';

// Loads a single album — an album-type collection — for the album page, through
// the same generic detail read as a mixtape or jam (`fetchCollection`).
//
// An album has no status field: where it is in its life is *derived*, from two
// numbers and a date, and that derivation lives here so every album surface
// agrees on it.
//
//   trackCount / maxTracks  the progress gauge, and what release waits on
//   open                    whether another track can be added right now
//   canRelease              full, and not yet out
//   releasedAt              the date it's shown by; null while unfinished
//
// **`open` and `canRelease` are not permission.** They describe the album, not
// the viewer, and this hook doesn't know who's looking. Both actions are the
// owning artist's alone, so combine them with `is_owner` from the artist read at
// the render site — for the track form that's the usual
// `open && (requestStatus.submitters === 'anyone' || isOwner)`, which on an
// album is `open && isOwner`. Rendering either control for a visitor draws a
// button that 403s.
export function useAlbum(id: string) {
  const { showToast } = useToast();
  const { data, loading, refetch } = useResource(
    () => fetchCollection(id),
    id ? `collection-${id}` : '',
    { onError: () => showToast('Failed to load album') },
  );

  const album = data?.collection ?? null;
  const requestStatus = data?.requestStatus ?? null;

  // The gauge prefers `request_status`, which the server evaluated on this read;
  // the collection's own counters are the same numbers from a colder angle, and
  // are all a list read gets.
  const trackCount = requestStatus?.track_count ?? album?.submission_count ?? 0;
  const maxTracks = requestStatus?.max_tracks ?? album?.max_tracks ?? null;
  const releasedAt = album?.released_at ?? null;

  return {
    album,
    songs: (data?.songs ?? []) as Song[],
    requestStatus,
    trackCount,
    maxTracks,
    releasedAt,
    released: releasedAt !== null,
    open: requestStatus?.open ?? false,
    canRelease: releasedAt === null && maxTracks !== null && trackCount >= maxTracks,
    loading,
    refetch,
  };
}
