import { useLayoutEffect } from 'react';

/**
 * Which of the two screens this page is.
 *
 * - `host` — a laptop on a television. The whole viewport, no scrollbar.
 * - `player` — a phone. The 430px strip, full height, tap-tuned.
 * - `auto` — neither, and has to read on both. The password gate.
 *
 * Lives on `<html>` as `data-view` and the CSS in `styles/index.css` does the
 * rest, so a page declares what it *is* and never measures anything. There is
 * deliberately no breakpoint here: a player on a desktop browser gets the phone
 * strip on purpose, because they are holding a controller either way, and a host
 * on a small window gets the TV layout scaled down rather than a third design
 * nobody tested.
 *
 * Layout effect, not effect: it must land before the browser paints, or the host
 * view flashes as a 430px column on the way in.
 */
export type ViewMode = 'host' | 'player' | 'auto';

export function useViewMode(mode: ViewMode): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.view;
    root.dataset.view = mode;
    return () => {
      // Restore rather than delete: two pages' effects overlap during a route
      // change, and the outgoing one must not strip the incoming one's mode.
      if (root.dataset.view === mode) {
        if (previous) root.dataset.view = previous;
        else delete root.dataset.view;
      }
    };
  }, [mode]);
}
