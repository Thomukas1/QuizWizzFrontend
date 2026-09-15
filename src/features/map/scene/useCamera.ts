import { useEffect, useMemo, useState } from 'react';
import { Camera, FrameOptions, Tile, frameTiles } from './camera';

// Tracks the viewport size, re-reading on resize. The camera reframes itself
// whenever this changes, so the board always fits the screen.
function useViewportSize(): { w: number; h: number } {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

// Frame a set of tiles into a Camera that tracks the live viewport. Recomputes
// only when the tiles or the viewport change — pass a stable `tiles` array
// (e.g. memoised at the call site) to avoid reframing every render.
export function useCamera(tiles: Tile[], opts?: FrameOptions): Camera {
  const { w, h } = useViewportSize();
  return useMemo(
    () => frameTiles(tiles, { w, h }, opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tiles, w, h, opts?.tileSize, opts?.margin],
  );
}
