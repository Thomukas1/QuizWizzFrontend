import { useMemo } from 'react';
import { useSongs } from './useSongs';
import { isReleased } from '../../services/slopbop';

export function useTopSong(artistId: string) {
  const { songs, loading } = useSongs(artistId);

  const topSong = useMemo(() => {
    // A not-yet-released song can't be the roster shortcut — it isn't playable.
    const playable = songs.filter(s => s.audio_url && isReleased(s));

    if (!playable.length) return null;
    return playable.reduce((best, s) => (s.bops ?? 0) >= (best.bops ?? 0) ? s : best);
  }, [songs]);

  return { topSong, loading };
}
