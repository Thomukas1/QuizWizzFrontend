import { useResource } from '../useResource';
import { fetchCollection, Song } from '../../services/slopbop';
import { useToast } from '../../context/ToastContext';

// A single jam, for the jam page. Same detail read and same open call as a
// mixtape; what a jam adds is a winner at the end of it. Both statuses come back
// because they answer different questions: `requestStatus` gates the submit form
// (and nothing else should), `openCallStatus` picks which act of the page to
// render.
//
// Two phases return `songs: []` and neither is a failure — the submission window
// of a `batch` jam (an `instant` one fills as it runs), and a resolved jam whose
// winner was lifted out. Fetch that winner with
// `useSong(openCallStatus.selected_song_id)`.
export function useJam(id: string) {
  const { showToast } = useToast();
  const { data, loading, refetch } = useResource(
    () => fetchCollection(id),
    id ? `collection-${id}` : '',
    {
      onError: () => showToast('Failed to load jam'),
      // Two live phases, two reasons: the count climbs while the window is open
      // (and in an instant jam, the tracks land there too), then the rest arrive
      // and the bops start moving.
      // Every other phase is static until a countdown elapses.
      pollMs: d =>
        d?.openCallStatus?.phase === 'open' || d?.openCallStatus?.phase === 'awaiting_resolution'
          ? 30_000
          : undefined,
    },
  );
  return {
    jam: data?.collection ?? null,
    songs: (data?.songs ?? []) as Song[],
    requestStatus: data?.requestStatus ?? null,
    openCallStatus: data?.openCallStatus ?? null,
    loading,
    // Phases turn on deadlines the server evaluates, so a page advances by
    // refetching when a countdown elapses.
    refetch,
  };
}
