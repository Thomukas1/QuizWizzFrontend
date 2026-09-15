import { useCallback } from 'react';
import { send } from '../../services/quizwizz';
import type { HostCommand } from '../../services/quizwizz';

/**
 * One envelope for every host command — which is what keeps the surface small
 * enough to operate while talking to a room. `next` is the spacebar and 90% of
 * the interaction.
 *
 * A refusal doesn't come back from this call. It arrives as an `error` on the
 * socket and lands in `state.refusal`, because the round's own module gets first
 * refusal on every command and may answer asynchronously: if the active round
 * claims `next` — a multi-step reveal does exactly this — the phase does not
 * advance and a fresh `view:display` arrives instead. Render `refusal` as a
 * toast in the corner.
 */
export function useHostCommand() {
  return useCallback((cmd: HostCommand, args?: Record<string, unknown>) => {
    send({ type: 'host:command', payload: { cmd, ...(args ? { args } : {}) } });
  }, []);
}
