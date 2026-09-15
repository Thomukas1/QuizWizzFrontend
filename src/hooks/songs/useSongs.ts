import { useResource } from '../useResource';
import { fetchSongs, Song } from '../../services/slopbop';
import { useToast } from '../../context/ToastContext';

export function useSongs(artistId: string) {
  const { showToast } = useToast();
  const { data, loading, refetch } = useResource(
    () => fetchSongs(artistId),
    artistId ? `songs-${artistId}` : '',
    { onError: () => showToast('Failed to load songs') },
  );
  const songs: Song[] = data ?? [];
  return { songs, loading, refetch };
}
