import { useResource } from '../useResource';
import { fetchCollection, Song } from '../../services/slopbop';
import { useToast } from '../../context/ToastContext';

// A single mixtape, for the mixtape page. It carries an `openCallStatus` now,
// same as a jam — one lifecycle, window → staggered release — so this returns the
// same pair `useJam` does and polls on the same rule.
export function useMixtape(id: string) {
  const { showToast } = useToast();
  const { data, loading, refetch } = useResource(
    () => fetchCollection(id),
    id ? `collection-${id}` : '',
    {
      onError: () => showToast('Failed to load mixtape'),
      pollMs: d =>
        d?.openCallStatus?.phase === 'open' || d?.openCallStatus?.phase === 'awaiting_resolution'
          ? 30_000
          : undefined,
    },
  );
  return {
    mixtape: data?.collection ?? null,
    songs: (data?.songs ?? []) as Song[],
    requestStatus: data?.requestStatus ?? null,
    openCallStatus: data?.openCallStatus ?? null,
    loading,
    refetch,
  };
}
