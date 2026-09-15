import { useResource } from '../useResource';
import { fetchCurrentJam } from '../../services/slopbop';

// The label's current jam, whoever is hosting it. A jam is a global event now
// rather than one artist's session, so this is the read the landing page runs on
// — no artist id, no list filtering.
//
// It answers with the most recently started jam in *any* phase, so between
// events the last one keeps showing rather than the surface going blank. `jam`
// is null in exactly one case: the label has never run one. That's a fact, not a
// failure — hide the section, don't show an error.
//
// `requestStatus` is here for the card's gauge: with no songs until the window
// shuts, the submission count is the only sign the jam is alive.
export function useCurrentJam() {
  const { data, loading, refetch } = useResource(fetchCurrentJam, 'jam-current', {
    onError: () => {},
  });
  return {
    jam: data?.collection ?? null,
    openCallStatus: data?.openCallStatus ?? null,
    requestStatus: data?.requestStatus ?? null,
    loading,
    refetch,
  };
}
