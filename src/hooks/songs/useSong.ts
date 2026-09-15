import { useResource } from '../useResource';
import { fetchSong } from '../../services/slopbop';

// One song by id, for a song no list can reach: a resolved jam's winner, which
// left the collection on its way to becoming a single.
//
// An empty id is a valid idle state (a jam that isn't resolved has no winner to
// fetch), so callers can pass `openCallStatus?.selected_song_id ?? ''` unconditionally
// rather than branching around the hook.
//
// Silent on failure. It's called next to a jam that already reported itself
// resolved, so a miss here is a gap in the page, not news to the visitor.
export function useSong(id: string) {
  const { data, loading, refetch } = useResource(
    () => fetchSong(id),
    id ? `song-${id}` : '',
    { onError: () => {} },
  );
  return { song: data ?? null, loading: id ? loading : false, refetch };
}
