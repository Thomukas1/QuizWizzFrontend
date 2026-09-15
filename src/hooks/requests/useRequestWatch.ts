import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useResource } from '../useResource';
import { fetchPendingRequests, type RequestType } from '../../services/slopbop';

/**
 * Waiting for the studio to finish making something.
 *
 * The queue (`/slopbop/requests`) is the only place an unfinished order exists,
 * so this asks the server instead of remembering anything — the wait survives
 * leaving the page, a reload, or an order placed from another device.
 *
 * **The queue starts a wait; the result ends it.** The studio marks an order done
 * and files what it made as two separate writes, so an empty queue can briefly
 * precede the thing appearing. An empty queue therefore only opens a short grace
 * period, and a grace period running out is the one signal that a job failed —
 * a failure is filed nowhere at all.
 *
 * Knows ids, not drafts. Point `landedIds` at whatever list the result lands in
 * — drafts, songs, a mixtape — and this is the whole of the wait.
 */

/** While the studio still has the order. Renders that run long run very long. */
const POLL_MS = 3000;
const SLOW_POLL_MS = 10000;
const BACKOFF_AFTER_MS = 60 * 1000;

/**
 * How long to keep believing in an order that has left the queue. Generous for
 * the gap between the two writes, but it is also the only thing that ends the
 * wait on a failure, so it can't be minutes.
 */
const SETTLE_MS = 30 * 1000;

interface Options {
  artistId: string;
  type: RequestType;
  /**
   * Ids in the list the result lands in; null until it has loaded. An id that
   * wasn't there when the wait began is the arrival.
   */
  landedIds: string[] | null;
  /** Re-read that list. Called on each pass while the grace period is open. */
  refetchLanded: () => void;
  /** Nothing came back. */
  onFailed: () => void;
}

export function useRequestWatch({
  artistId,
  type,
  landedIds,
  refetchLanded,
  onFailed,
}: Options) {
  const visible = usePageVisible();
  const [waiting, setWaiting] = useState(false);

  // Callers pass inline arrows and a fresh array; refs and a value key keep
  // those from re-arming everything below on every render.
  const refetchLandedRef = useRef(refetchLanded);
  refetchLandedRef.current = refetchLanded;
  const onFailedRef = useRef(onFailed);
  onFailedRef.current = onFailed;
  const landedRef = useRef(landedIds);
  landedRef.current = landedIds;
  const landedKey = landedIds?.join('|') ?? null;

  // The one-at-a-time claim. A ref, not `waiting`: two clicks in the same tick
  // both read the same stale state, and the server enforces nothing.
  const busy = useRef(false);
  /**
   * What was in the list before this order — a set, because some orders replace
   * what they were given (a reroll deletes the draft it re-orders) and the next
   * item down would otherwise read as an arrival. Null until the list has
   * loaded: on a cold page the queue can answer first.
   */
  const baseline = useRef<Set<string> | null>(null);
  const startedAt = useRef(0);
  /** When to give up. Armed only while the queue is empty. */
  const settleBy = useRef(0);
  /**
   * Orders already finished with. A wait ends while the newest queue response
   * still lists its order, so without this the effect below would read that
   * response and start over — against a baseline that now contains the arrival.
   */
  const settled = useRef<Set<string>>(new Set());

  const queue = useResource(
    () => fetchPendingRequests(artistId, type),
    artistId ? `queue-${type}-${artistId}` : '',
    {
      // Only while something is outstanding, and never in a tab nobody's
      // looking at — a forgotten interval in a background tab is how this
      // pattern turns into a load problem.
      pollMs: () => {
        if (!waiting || !visible) return undefined;
        return Date.now() - startedAt.current > BACKOFF_AFTER_MS ? SLOW_POLL_MS : POLL_MS;
      },
      // Quiet: this runs on a timer, and a blip shouldn't shout. The grace
      // period still ends the wait if the queue stays unreachable.
      onError: () => {},
    },
  );

  // Memoised: an effect depends on it, and `?? []` alone would hand it a new
  // empty array every render.
  const pending = useMemo(() => queue.data ?? [], [queue.data]);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const { refetch: refetchQueue } = queue;

  /** Claim the slot. False means something is already in flight. */
  const begin = useCallback(() => {
    if (busy.current) return false;
    busy.current = true;
    baseline.current = landedRef.current ? new Set(landedRef.current) : null;
    startedAt.current = Date.now();
    settleBy.current = 0;
    setWaiting(true);
    return true;
  }, []);

  const end = useCallback(
    (failed: boolean) => {
      // Whatever the queue last showed is what we just finished with.
      pendingRef.current.forEach(r => settled.current.add(r.request_id));
      busy.current = false;
      settleBy.current = 0;
      setWaiting(false);
      // Polling has stopped, so nothing else would ever correct that response.
      refetchQueue();
      if (failed) onFailedRef.current();
    },
    [refetchQueue],
  );

  /** Give up the slot without waiting — the order was refused. */
  const abandon = useCallback(() => end(false), [end]);

  // Something in flight we weren't watching: ordered before this page opened,
  // or from another device. This is what makes a reopened page know it's busy.
  useEffect(() => {
    // Orders that have left the queue can't restart anything, so stop
    // remembering them — this set only has to out-live one stale response.
    if (settled.current.size) {
      settled.current = new Set(
        [...settled.current].filter(id => pending.some(r => r.request_id === id)),
      );
    }
    if (waiting) return;
    if (pending.some(r => !settled.current.has(r.request_id))) begin();
  }, [pending, waiting, begin]);

  // The list loading after the queue did — see `baseline`. Once set it stays put
  // until the next wait.
  useEffect(() => {
    if (waiting && baseline.current === null && landedRef.current) {
      baseline.current = new Set(landedRef.current);
    }
  }, [waiting, landedKey]);

  // Arrival, or giving up. Re-runs on every queue response and whenever the
  // watched list actually changes, which is also what paces the grace period —
  // there's no separate timer to clean up.
  useEffect(() => {
    if (!waiting) return;

    // Read into a local: with no baseline yet there is nothing to be
    // unrecognised *against*, and everything already there would look new.
    const known = baseline.current;
    if (known && landedRef.current?.some(id => !known.has(id))) {
      end(false);
      return;
    }

    // Still queued or rendering. Disarm on the way past: the grace period only
    // means anything from the moment the queue lets go, and it can be armed
    // early — the tick after an order is placed, before the first queue answer,
    // looks exactly like an empty queue.
    if (pending.length > 0) {
      settleBy.current = 0;
      return;
    }

    // The order is gone and the result isn't here: either the split second
    // between the two writes, or it failed and nothing is coming.
    if (!settleBy.current) settleBy.current = Date.now() + SETTLE_MS;
    if (Date.now() > settleBy.current) {
      end(true);
      return;
    }
    // Safe to call on every pass: the caller's list is compared by value, so an
    // unchanged answer doesn't re-run this.
    refetchLandedRef.current();
  }, [waiting, pending, landedKey, end]);

  // Coming back to a hidden tab: both are as stale as the time spent away, so
  // don't wait out an interval before showing what happened.
  const wasVisible = useRef(visible);
  useEffect(() => {
    const returned = visible && !wasVisible.current;
    wasVisible.current = visible;
    if (returned && waiting) {
      refetchQueue();
      refetchLandedRef.current();
    }
  }, [visible, waiting, refetchQueue]);

  return { waiting, begin, abandon };
}

/**
 * Whether the tab is being looked at. Polling stops when it isn't — a queue is
 * the sort of thing a phone left in a pocket would ask about all night.
 */
function usePageVisible() {
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}
