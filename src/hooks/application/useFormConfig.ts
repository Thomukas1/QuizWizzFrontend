import { ApiError, fetchFormConfig } from '../../services/slopbop';
import { useResource } from '../useResource';

// A 503 is the one failure that isn't one: the backend serves the form from config
// the simulator pushes, and nothing has been pushed yet. That's "not open", not
// "broken", and it's the difference between someone retrying and someone leaving.
function messageFor(error: unknown): string {
  if (error instanceof ApiError && error.status === 503) {
    return 'Applications are not open yet. Check back soon.';
  }
  return 'Failed to load form';
}

// The application form config is static for a session — fetch once, cached +
// in-flight-deduped by useResource's cache mode. Unlike the world hooks it
// surfaces an `error` flag so the form can render an inline load-failure state
// instead of a toast. A failed load is retryable on remount.
export function useFormConfig() {
  const { data: config, loading, error } = useResource(fetchFormConfig, 'form-config', {
    cache: true,
  });
  return { config, loading, error: error ? messageFor(error) : null };
}
