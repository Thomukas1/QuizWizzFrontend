import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getSnapshot, subscribe } from '../../services/quizwizz';
import type { QuizWizzReason } from '../../services/quizwizz';

/**
 * **Tap, pending, locked — the three states a submitted answer moves through.**
 *
 * `usePlayerActions` deliberately holds no optimistic state, and the registry's
 * prop comment says to wait for `answer:ack` before showing a choice as locked
 * in. That rule is right: a rejected submission must never leave a phone
 * claiming an answer the server never took. But two states are not enough — a
 * 30-second question on bad hotel wifi would feel dead for a whole round trip,
 * and a button that doesn't answer the thumb gets tapped again and again.
 *
 * So there are three:
 *
 * 1. **Tap** — every button goes dead and the tapped one is *pending*. Nothing
 *    claims the server took it.
 * 2. **`answer:ack`, or the next frame's `yourChoice`** — whichever lands first
 *    confirms it as locked in.
 * 3. **A refusal that isn't `already_answered`** — the buttons come back, with a
 *    sentence saying why.
 *
 * It watches **`ack.seq`**, not the ack's contents: `store.ts` bumps that per
 * ack, so a repeat of an identical refusal is still a new event. Comparing the
 * payload would swallow the second one.
 *
 * Nothing here reaches for the socket. It reads the store the same way React
 * reads anything else, which is what keeps "add a game" to one registry line.
 */

/**
 * What a phone says about each refusal. Three different sentences, because they
 * are three different situations for the person holding it.
 *
 * **`already_answered` is not in here, and that is the whole point of it.** It
 * is success-flavoured: the expected reply to a double-tap, or to a resend after
 * a reconnect, and it means "locked in". Rendering it as an error makes an
 * ordinary double-tap look like a bug.
 */
const NOTICE: Partial<Record<QuizWizzReason, string>> = {
  too_late: 'Missed that one',
  // The buttons weren't live — an intro, a lock, a reveal. The frame is the
  // truth about that, so the phone re-syncs and says as little as possible.
  not_allowed: 'Not open yet',
  malformed_payload: "That didn't send — try again",
};

interface AnswerLock {
  /** Locked in. Non-null disables the row and is the locked state itself. */
  chosen: string | null;
  /** Tapped, unconfirmed. Null the moment `chosen` lands. */
  pending: string | null;
  /** A sentence to show, or null. Cleared when the item changes. */
  notice: string | null;
  pick: (key: string) => void;
}

interface AnswerLockOptions {
  /** The item on the frame. Null outside an item — nothing to submit against. */
  itemId: string | null;
  /**
   * **Which attempt at this item this is**, for a format that collects more than
   * one answer against the same item.
   *
   * Everything below is scoped by item, which was the whole story until
   * Popularity asked the same item twice — an opinion, then a prediction, on one
   * `itemId`. The server hands that phone `yourChoice: null` when the second
   * question opens, correctly, but the local memory underneath still matches on
   * the item alone and would repaint the first answer as locked in, with every
   * button dead and nothing to do about it.
   *
   * So a caller that has two attempts names them (Popularity passes
   * `state.phase`) and a caller with one leaves this out. **It never reaches the
   * wire**: `answer()` is still called with the real `itemId`, and the ack is
   * still matched on it, because the server has one item here too. This scopes
   * what is remembered, not what is sent.
   *
   * The server kit draws the same line with `shows` on a step — which of an
   * item's stores a step is about is a thing a format declares rather than
   * something either side infers.
   */
  round?: string | null;
  /** `state.yourChoice`, echoed back by the server. It wins over everything. */
  yourChoice: string | null;
  /** Whether the buttons are live, off the frame. */
  open: boolean;
  /** The registry's sender, already bound to the run. */
  answer: (itemId: string, choice: unknown) => void;
}

/** A record is only about the attempt it was made for; anything else is ignored. */
interface ForScope {
  scope: string;
  value: string;
}

export function useAnswerLock({ itemId, round, yourChoice, open, answer }: AnswerLockOptions): AnswerLock {
  // Just the ack, not the whole store: `set()` preserves the field's identity
  // unless the field changed, so this re-renders on an ack and on nothing else.
  const ack = useSyncExternalStore(subscribe, () => getSnapshot().ack);

  const [pending, setPending] = useState<ForScope | null>(null);
  const [locked, setLocked] = useState<ForScope | null>(null);
  const [notice, setNotice] = useState<ForScope | null>(null);

  // What every record below is about: this attempt at this item. Without a
  // `round` it is the item, which is what it always was.
  const scope = itemId === null ? null : `${itemId}#${round ?? ''}`;

  // Which ack has already been acted on. Without it the effect would re-run on
  // its own `setPending` and process the same refusal twice.
  const handled = useRef(-1);

  useEffect(() => {
    if (!ack || ack.seq === handled.current) return;
    handled.current = ack.seq;

    // An ack for the item before this one: the frame has already moved on and
    // whatever it says is about a question nobody is looking at. **Matched on
    // the item, not the scope** — the server has one item here and its ack says
    // so; the round is this side's own bookkeeping.
    if (!itemId || !scope || ack.itemId !== itemId) return;

    const release = (reason?: QuizWizzReason) => {
      setPending(null);
      const text = reason ? NOTICE[reason] : undefined;
      setNotice(text ? { scope, value: text } : null);
    };

    // Accepted, or already held — both mean locked in. The key is whatever was
    // tapped; when there is no pending tap (a resend after a reconnect) the
    // next frame's `yourChoice` says it instead, so there is nothing to guess.
    if (ack.accepted || ack.reason === 'already_answered') {
      // Only if the tap it answers belongs to the attempt on screen. A phase A
      // answer acknowledged after phase B opened clears the stale pending tap
      // and locks nothing, which is the case this scoping exists for.
      if (pending?.scope === scope) setLocked(pending);
      setPending(null);
      setNotice(null);
      return;
    }

    // An answer for a game that has finished. Drop it silently — there is
    // nothing the person holding the phone could have done differently, and
    // nothing they can do now.
    if (ack.reason === 'stale_run') return release();

    release(ack.reason);
    // `pending` is a dependency so the effect reads the tap this ack answers,
    // and the `handled` guard above is what stops it acting on the same ack
    // again when that tap changes underneath it.
  }, [ack, itemId, scope, pending]);

  const pick = useCallback(
    (key: string) => {
      // The frame decides whether a tap is allowed. Guarded here as well as in
      // the button's `disabled`, because a tap that beats a frame by 50ms would
      // otherwise earn a refusal the room reads as a bug.
      if (!itemId || !scope || !open) return;
      setPending({ scope, value: key });
      setNotice(null);
      // The real item, always. The round scopes what is remembered here, never
      // what is sent.
      answer(itemId, key);
    },
    [itemId, scope, open, answer],
  );

  // `yourChoice` is the server's own word and outranks anything held locally —
  // a reconnecting phone repaints its locked-in answer from this alone.
  const chosen =
    yourChoice ?? (locked && locked.scope === scope ? locked.value : null);

  return {
    chosen,
    pending: !chosen && pending?.scope === scope ? pending.value : null,
    notice: notice?.scope === scope ? notice.value : null,
    pick,
  };
}
