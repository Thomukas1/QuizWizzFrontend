import { useResource } from '../useResource';
import { liveSession } from '../../services/quizwizz';
import type { LiveSessionResponse } from '../../services/quizwizz';

/**
 * Is a game running? What the join page asks before it offers a name field, so
 * that "no game right now" is a state of the page rather than a form whose
 * submit is guaranteed to fail.
 *
 * Polled, because the answer changes without anyone here doing anything: a phone
 * that lands on `/play` a minute before the host hits start should turn into a
 * join form by itself, not reward a pull-to-refresh nobody thinks to try.
 */
const POLL_MS = 5000;

export function useLiveSession() {
  return useResource<LiveSessionResponse>(liveSession, 'quizwizz:session', { pollMs: POLL_MS });
}
