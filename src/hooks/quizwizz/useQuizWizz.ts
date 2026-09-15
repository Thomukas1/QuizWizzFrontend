import { useEffect, useSyncExternalStore } from 'react';
import { connect, disconnect, getSnapshot, subscribe } from '../../services/quizwizz';
import type { QuizWizzState, Role } from '../../services/quizwizz';

/**
 * **The connection, and everything it knows.** One per page: `/host` mounts it
 * as `host`, `/play` as `player`.
 *
 * Pass `null` to stay disconnected — which is what a page does while it's still
 * showing its door, before a token exists. The state is readable either way, so
 * a login form and a running game read from the same place.
 *
 * Nothing is mirrored into component state: the store is the one copy, and a
 * mirrored copy is a copy that can disagree with the server mid-round.
 */
export function useQuizWizz(role: Role | null): QuizWizzState {
  const state = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    if (!role) return;
    connect(role);
    return disconnect;
  }, [role]);

  return state;
}
