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
   * One of the emoji the snapshot's `reactions` offered — the bar renders a
   * button per entry and the server accepts that exact list, so anything else
   * can only come from a bug. The server rate-limits per player and drops the
   * excess silently, which is why mashing needs no handling here.
   */
  const react = useCallback((emoji: string) => {
    send({ type: 'player:react', payload: { emoji } });
  }, []);

  /**
   * **Quit, as opposed to drop.** Closing the socket cannot express this — a
   * pocketed phone and a deliberate exit are the same event down there — so the
   * intent has to go over the wire *before* the connection goes away. The server
   * removes the player rather than greying them out, which is what makes coming
   * back a fresh join with the name and avatar they meant to pick.
   *
   * Unbound to the run: leaving mid-question is the most likely moment for it.
   *
   * A quit typed while the socket is down is dropped like anything else, and the
   * roster keeps the player as disconnected — the host's `kick` is the fallback,
   * and one stale tile is a better failure than a phone that can't leave.
   */
  const leave = useCallback(() => {
    send({ type: 'player:leave', payload: {} });
  }, []);

  return useMemo(() => ({ answer, input, react, leave }), [answer, input, react, leave]);
}
