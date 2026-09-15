import { useEffect, useRef, useState } from 'react';
import { IMAGE_SWAP_MS, createImageLoader } from '../../services/arweave';
import { useGateway } from './useGateway';

interface ArweaveImage {
  /** What to put in `src`. */
  src: string | undefined;
  /** Remount key — assigning the same src back isn't reliably a reload. */
  key: number;
  /** Whether the image has settled, either loaded or given up. */
  settled: boolean;
  /** Whether this url is ours to route, which is also what earns it `crossorigin`. */
  routed: boolean;
  onLoad: () => void;
  /** Resolves `true` once there's nothing left to try and the caller should give up. */
  onError: () => Promise<boolean>;
}

/**
 * React binding for `createImageLoader` — the loader owns the url, the budget
 * and the decisions; this owns only the state React needs to re-render on.
 *
 * Unlike media, an image *is* re-pointed when the app moves gateways, but only
 * while it's still waiting: one already on screen keeps the url it loaded from,
 * because re-deriving would re-download every visible image the moment a song
 * moved the app somewhere else.
 */
export function useArweaveImage(src: string | undefined): ArweaveImage {
  const loader = useRef(createImageLoader(src)).current;
  const [settled, setSettled] = useState(false);
  const [key, setKey] = useState(0);
  const retryTimer = useRef<number | undefined>(undefined);
  const swapTimer = useRef<number | undefined>(undefined);

  const gateway = useGateway();

  // Reset during render rather than in an effect, so a stale attempt can't
  // briefly survive into the new src's key and cost an extra fetch.
  const [prevSrc, setPrevSrc] = useState(src);
  const [prevGateway, setPrevGateway] = useState(gateway);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setPrevGateway(gateway);
    loader.reset(src);
    setSettled(false);
    setKey(k => k + 1);
  } else if (gateway !== prevGateway) {
    setPrevGateway(gateway);
    if (!settled) {
      loader.repoint();
      setKey(k => k + 1);
    }
  }

  // No `progress` event on an <img>, so a hung gateway is only ever visible as
  // "still not loaded" — and a sick one takes ~15s to answer.
  useEffect(() => {
    if (settled || !loader.routed || !loader.src) return;
    swapTimer.current = window.setTimeout(() => {
      loader.expired().then(outcome => {
        if (outcome === 'retry') setKey(k => k + 1);
        else if (outcome === 'give-up') setSettled(true);
        // 'moved' re-points us through the gateway subscription above.
      });
    }, IMAGE_SWAP_MS);
    return () => window.clearTimeout(swapTimer.current);
  }, [settled, key, loader]);

  useEffect(() => () => {
    window.clearTimeout(retryTimer.current);
    window.clearTimeout(swapTimer.current);
  }, []);

  return {
    src: loader.src,
    key,
    settled,
    routed: loader.routed,
    onLoad: () => setSettled(true),
    onError: async () => {
      const outcome = await loader.failed();
      if (outcome === 'retry') {
        setKey(k => k + 1);
        return false;
      }
      if (outcome === 'give-up') {
        setSettled(true);
        return true;
      }
      return false; // 'moved' — the subscription re-points us
    },
  };
}
