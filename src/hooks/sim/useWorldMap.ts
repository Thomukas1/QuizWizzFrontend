import { fetchWorldMap } from '../../services/slopbop';
import { useToast } from '../../context/ToastContext';
import { useResource } from '../useResource';

// The world map is static for a season — fetch once, cached + in-flight-deduped
// by useResource's cache mode.
export function useWorldMap() {
  const { showToast } = useToast();
  const { data: map, loading } = useResource(fetchWorldMap, 'world-map', {
    cache: true,
    onError: () => showToast('Failed to load world map'),
  });
  return { map, loading };
}
