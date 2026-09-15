import { useResource } from '../useResource';
import { fetchArtist } from '../../services/slopbop';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export function useArtist(id: string) {
  const { showToast } = useToast();
  const { userId } = useAuth();

  // The session is part of the key, not just of the request: the same URL
  // answers differently signed in (`is_owner`), which is why the route sends
  // `Vary: Authorization`. Keying on the user makes signing in or out refetch
  // instead of leaving a page that still thinks you're a stranger.
  const { data, loading, refetch } = useResource(
    () => fetchArtist(id),
    id ? `artist-${id}-${userId ?? 'anon'}` : '',
    { onError: () => showToast('Failed to load artist') },
  );

  // `refetch` is how an owner's edit lands on the page: the write answers with
  // the new document, but the read owns this state, so the page re-reads rather
  // than two copies of the artist being kept in step by hand.
  return { artist: data?.artist ?? null, isOwner: data?.isOwner ?? false, loading, refetch };
}
