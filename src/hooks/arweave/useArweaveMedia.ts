import { useEffect, useRef, useState } from 'react';
import { createMediaLoader, type MediaLoader } from '../../services/arweave';

interface ArweaveMedia<T extends HTMLMediaElement> {
  /** Attach to the element. Leave its `src` off the JSX — the loader owns it. */
  ref: React.RefObject<T | null>;
  /** Whether bytes are currently being waited on. */
  loading: boolean;
  /** Set once every gateway and retry is spent. */
  failed: boolean;
}

/**
 * Gateway-routed loading for a component-owned `<video>` or `<audio>`.
 *
 * The element gets its `src` from the loader, not from JSX, because failing over
 * *is* reassigning `src` — React setting it back would undo the recovery. So
 * render the element without one and hand over the ref.
 *
 * Deliberately not re-pointed when the app moves gateways: this element may be
 * mid-playback, and interrupting a video that's working to follow a move some
 * other asset triggered would be a downgrade. It routes on load and fails over
 * on its own from there.
 *
 * `MusicPlayerContext` doesn't use this — it owns a persistent element outside
 * React and drives `createMediaLoader` directly.
 */
export function useArweaveMedia<T extends HTMLMediaElement>(
  storedUrl: string | undefined,
): ArweaveMedia<T> {
  const ref = useRef<T | null>(null);
  const loaderRef = useRef<MediaLoader | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !storedUrl) return;

    setFailed(false);
    const loader = createMediaLoader(el, {
      onLoadingChange: setLoading,
      onFailed: () => setFailed(true),
    });
    loaderRef.current = loader;
    loader.load(storedUrl);

    return () => {
      loader.dispose();
      loaderRef.current = null;
    };
  }, [storedUrl]);

  return { ref, loading, failed };
}
