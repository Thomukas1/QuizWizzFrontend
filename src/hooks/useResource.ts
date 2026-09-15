import { useState, useEffect, useRef, useCallback } from 'react';

interface UseResourceOptions<T> {
  onError?: (err: unknown) => void;
  // Fixed-interval polling, or a function of the latest data (useful when "should I keep
  // polling?" depends on what was just loaded — e.g. stop once a past sim is in hand).
  // Future: align to sim's 10-min tick boundary (refetch ~15s after wallclock crosses
  // :00/:10/:20…) to match content cadence.
  pollMs?: number | ((data: T | null) => number | undefined);
  // When true, resolve once per `key`, cache the result at module scope, and share a
  // single in-flight request across concurrent callers. For data that's static for a
  // session (world map, item catalogue, form config). Cached resources never poll.
  cache?: boolean;
}

// Module-scope caches for `cache: true` resources, keyed by the resource `key`.
// resolvedCache holds settled values; inflightCache dedupes concurrent first-loads.
const resolvedCache = new Map<string, unknown>();
const inflightCache = new Map<string, Promise<unknown>>();

export function useResource<T>(
  fetcher: () => Promise<T>,
  key: string,
  options: UseResourceOptions<T> = {},
) {
  const cache = options.cache ?? false;
  const [data, setData] = useState<T | null>(
    cache && resolvedCache.has(key) ? (resolvedCache.get(key) as T) : null,
  );
  // True from the first render, before the effect below runs: a keyed resource is
  // *going* to fetch, and `false` with null data is indistinguishable from a
  // finished load that found nothing. No key, no fetch, nothing pending.
  const [loading, setLoading] = useState(cache ? !resolvedCache.has(key) : !!key);
  const [error, setError] = useState<unknown>(null);

  const fetchKeyRef = useRef('');
  const fetcherRef = useRef(fetcher);
  const onErrorRef = useRef(options.onError);

  fetcherRef.current = fetcher;
  onErrorRef.current = options.onError;

  const refetch = useCallback(() => {
    if (!key) return;
    fetchKeyRef.current = key;

    // Already cached: serve it, no request.
    if (cache && resolvedCache.has(key)) {
      setData(resolvedCache.get(key) as T);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Cached resources share one in-flight promise per key; everyone else fetches fresh.
    let run: Promise<T>;
    if (cache) {
      const existing = inflightCache.get(key) as Promise<T> | undefined;
      run = existing ?? fetcherRef.current();
      if (!existing) inflightCache.set(key, run);
    } else {
      run = fetcherRef.current();
    }

    run
      .then(result => {
        if (cache) resolvedCache.set(key, result);
        if (fetchKeyRef.current !== key) return;
        setData(result);
      })
      .catch(err => {
        if (cache) inflightCache.delete(key); // failed load is retryable on remount
        if (fetchKeyRef.current !== key) return;
        setError(err);
        onErrorRef.current?.(err);
      })
      .finally(() => {
        if (cache) inflightCache.delete(key);
        if (fetchKeyRef.current === key) setLoading(false);
      });
  }, [key, cache]);

  useEffect(() => {
    if (!key) return;
    refetch();
  }, [refetch, key]);

  const effectivePollMs = typeof options.pollMs === 'function'
    ? options.pollMs(data)
    : options.pollMs;

  useEffect(() => {
    if (!key || cache || !effectivePollMs) return; // cached resources don't poll
    const id = setInterval(refetch, effectivePollMs);
    return () => clearInterval(id);
  }, [key, cache, effectivePollMs, refetch]);

  return { data, loading, error, refetch };
}
