import { fetchWorldItems } from '../../services/slopbop';
import { useToast } from '../../context/ToastContext';
import { useResource } from '../useResource';

// The item catalogue is static for a session — fetch once, cached + in-flight-deduped
// by useResource's cache mode. Mirrors useWorldMap.
export function useWorldItems() {
  const { showToast } = useToast();
  const { data: items, loading } = useResource(fetchWorldItems, 'world-items', {
    cache: true,
    onError: () => showToast('Failed to load items'),
  });
  return { items, loading };
}
