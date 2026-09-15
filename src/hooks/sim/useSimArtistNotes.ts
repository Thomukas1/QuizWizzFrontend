import { useResource } from '../useResource';
import { fetchSimArtistNotes, Note } from '../../services/slopbop';
import { useToast } from '../../context/ToastContext';

const POLL_MS = 2 * 60 * 1000;

interface Options {
  live?: boolean;
}

export function useSimArtistNotes(
  simulationId: string,
  artistId: string,
  { live = false }: Options = {},
) {
  const { showToast } = useToast();
  const { data, loading, refetch } = useResource(
    () => fetchSimArtistNotes(simulationId, artistId),
    simulationId && artistId ? `sim-${simulationId}-artist-${artistId}-notes` : '',
    {
      onError: () => showToast('Failed to load notes'),
      pollMs: live ? POLL_MS : undefined,
    },
  );
  const notes: Note[] = data ?? [];
  return { notes, loading, refetch };
}
