import { useResource } from '../useResource';
import { fetchArtists, Artist } from '../../services/slopbop';
import { useToast } from '../../context/ToastContext';

export function useArtists(limit?: number) {
  const { showToast } = useToast();
  const { data, loading } = useResource(
    () => fetchArtists(limit).then(map => Object.values(map)),
    `artists-${limit ?? 'all'}`,
    { onError: () => showToast('Failed to load artists') },
  );
  const artists: Artist[] = data ?? [];
  return { artists, loading };
}
