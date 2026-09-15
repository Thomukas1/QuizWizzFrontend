import { useResource } from '../useResource';
import { fetchImages } from '../../services/slopbop';

/**
 * An artist's kept images — the gallery, without the rest of the studio.
 *
 * `useImageStudio` also holds this list, but it comes with the drafts, the order
 * watcher and the four writes, because everything in there moves an image
 * between the two lists. Somewhere that only wants to *read* the gallery — the
 * profile editor picking a picture — shouldn't mount a poller to do it.
 *
 * Owner-gated server-side: a session that doesn't manage this artist gets a 403,
 * so only owner UI should ask.
 */
export function useSavedImages(artistId: string) {
  const { data, loading, error } = useResource(
    () => fetchImages(artistId),
    artistId ? `saved-images-${artistId}` : '',
  );

  return { images: data ?? [], loading, error };
}
