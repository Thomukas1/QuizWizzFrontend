import { useSyncExternalStore } from 'react';
import { getBotsSnapshot, subscribeBots } from '../../services/quizwizz';
import type { BotsState } from '../../services/quizwizz';

/**
 * **The NPC flock, for the one control that operates it.**
 *
 * Read the same way the session is read — a module-scope observable through
 * `useSyncExternalStore` — because bots outlive any component that shows them:
 * they are live sockets, and a panel unmounting must not take the room's players
 * with it.
 *
 * This is a test harness. Nothing in the game reads it, and nothing should: a
 * bot is a player like any other, and the roster the server broadcasts is where
 * every view learns about it.
 */
export function useBots(): BotsState {
  return useSyncExternalStore(subscribeBots, getBotsSnapshot);
}
