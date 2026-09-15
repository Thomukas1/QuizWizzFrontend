import { useCallback, useMemo, useRef } from 'react';
import { send } from '../../services/quizwizz';

/**
 * Everything a phone can send. Bound to the current `runId` — one playthrough of
 * one game — because every submission carries it: a late answer for a finished
 * game comes back `answer:ack { accepted: false, reason: 'stale_run' }` rather
 * than scoring against whatever is on screen now.
 *
 * Pass `null` outside `GAME` and the two submission senders become no-ops, so a
 * component doesn't need to guard each call site. `react` is unbound and always
 * live: a reaction belongs to the room, not to a game.
 */
export function usePlayerActions(runId: string | null) {
  // The minigame channel's sequence number is the client's to own — the server
  // uses it to order a burst of inputs it may receive out of order, and never to
  // time them. A ref, not state: bumping it must not re-render a game mid-tap.
  const seq = useRef(0);

  /**
   * One answer. There is no optimistic state here on purpose — wait for
   * `answer:ack` before showing a choice as locked in, or a rejected submission
   * leaves the phone claiming an answer the server never took.
   */
  const answer = useCallback(
    (itemId: string, choice: unknown) => {
      if (!runId) return;
      send({ type: 'player:answer', payload: { runId, itemId, choice } });
    },
    [runId],
  );

  /** The minigame channel: many small events, no ack, fire and forget. */
  const input = useCallback(
    (type: string, payload?: unknown) => {
      if (!runId) return;
      send({ type: 'player:input', payload: { runId, seq: seq.current++, type, payload } });
    },
    [runId],
  );

  /**
   * An emoji from `EMOJI_PALETTE` — the buttons are rendered from it, so an
   * off-list value can only come from a bug. The server rate-limits per player
   * and drops the excess silently, which is why mashing needs no handling here.
   */
  const react = useCallback((emoji: string) => {
    send({ type: 'player:react', payload: { emoji } });
  }, []);

  return useMemo(() => ({ answer, input, react }), [answer, input, react]);
}
