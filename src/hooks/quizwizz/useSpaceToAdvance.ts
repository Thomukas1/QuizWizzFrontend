import { useEffect } from 'react';
import { useHostCommand } from './useHostCommand';

/**
 * **Space → `next`.** The only binding that matters, and 90% of the interaction:
 * you are standing in front of a room, talking, with one hand on a laptop.
 *
 * `preventDefault` is not optional — Space scrolls a page by default, and the
 * host view would jump every time the show advanced.
 *
 * The key is bound once and unconditionally, and what it *means* is the server's
 * business: the active round gets first refusal on every command, so a
 * multi-step reveal can claim `next` and get a fresh frame instead of a phase
 * change. That is exactly why there is one key and no second one — the client
 * never decides what advancing means.
 *
 * `enabled` is for the connection, not the phase. A refused command comes back
 * as a toast, which is more useful than a key that silently does nothing.
 */
export function useSpaceToAdvance(enabled: boolean): void {
  const command = useHostCommand();

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space' && event.key !== ' ') return;
      // A password field is the one place on the host's screen where a space is
      // a space. Cheap to check, and the alternative is a bug you only find
      // while someone is watching you type.
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.repeat) return; // held down is one advance, not forty

      event.preventDefault();
      command('next');
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, command]);
}
