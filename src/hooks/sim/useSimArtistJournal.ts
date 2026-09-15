import { useResource } from '../useResource';
import { fetchSimArtistJournal, JournalEntry } from '../../services/slopbop';
import { useToast } from '../../context/ToastContext';

const POLL_MS = 2 * 60 * 1000;

interface Options {
  live?: boolean;
}

export function useSimArtistJournal(
  simulationId: string,
  artistId: string,
  { live = false }: Options = {},
) {
  const { showToast } = useToast();
  const { data, loading, refetch } = useResource(
    () => fetchSimArtistJournal(simulationId, artistId),
    simulationId && artistId ? `sim-${simulationId}-artist-${artistId}-journal` : '',
    {
      onError: () => showToast('Failed to load journal'),
      pollMs: live ? POLL_MS : undefined,
    },
  );
  const entries: JournalEntry[] = data ?? [];
  return { entries, loading, refetch };
}
