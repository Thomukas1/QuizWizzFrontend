import type { Deadline } from './protocol';

/**
 * **One clock, shared with the server.**
 *
 * Deadlines are absolute *server* timestamps, shipped once, and every client
 * counts down locally against them. That is the only design that survives forty
 * phones — the alternative, ticking remaining-milliseconds down the wire, is
 * forty timers drifting apart at forty different rates. The cost is that a
 * device whose clock is ninety seconds fast would render an already-expired
 * timer, so the offset between the two clocks has to be measured.
 *
 * Nothing here talks to the socket; `socket.ts` drives it. This file only knows
 * how to turn samples into an offset.
 */

let offset = 0;

/** The round trip of the best sample so far. Infinity until one lands. */
let bestRtt = Number.POSITIVE_INFINITY;

/** Server time, as well as this device can tell. The only clock the UI may read. */
export const serverNow = (): number => Date.now() + offset;

/** Milliseconds left on a deadline, floored at zero. Null deadline means no timer. */
export const remaining = (deadline: Deadline | null): number =>
  deadline ? Math.max(0, deadline.endsAt - serverNow()) : 0;

/**
 * How much of a deadline is left, 0–1, for a bar that shrinks. A deadline with
 * no duration reads as expired rather than dividing by zero.
 */
export const fractionLeft = (deadline: Deadline | null): number => {
  if (!deadline) return 0;
  const span = deadline.endsAt - deadline.startedAt;
  return span > 0 ? remaining(deadline) / span : 0;
};

/**
 * The digit a television reads out. **Ceiling, not floor** — a clock with 200ms
 * left still shows `1`, and reaches `0` only when it is genuinely over.
 * Flooring shows `0` for the whole final second, which is a second of the room
 * believing it is too late while the server is still accepting answers.
 */
export const secondsLeft = (deadline: Deadline | null): number =>
  Math.ceil(remaining(deadline) / 1000);

/**
 * Whether this clock is one the room is meant to be watching.
 *
 * `beat` is the drumroll between locking a question and revealing it: a real
 * deadline the server is counting, and nothing anybody can act on. A bar that
 * flashed through one second of it would read as a countdown that had broken,
 * so the honest render of a beat is no clock at all.
 */
export const isVisible = (deadline: Deadline | null): boolean =>
  !!deadline && deadline.kind !== 'beat';

/**
 * Seed a rough offset from `session:snapshot`'s `tServer`.
 *
 * One-way, so it carries the whole network latency as error — but it lands
 * before the first ping completes, and a timer that is 80ms out for 300ms is
 * invisible where a timer that is an hour out is not. Recorded with a deliberately
 * poor `bestRtt` so the first real sample always wins.
 */
export function seedOffset(tServer: number): void {
  if (bestRtt !== Number.POSITIVE_INFINITY) return; // a measured sample already beat this
  offset = tServer - Date.now();
}

/**
 * Fold in one `sync:pong`. Keeps the sample with the lowest round trip rather
 * than averaging: a fast exchange is a *measurement*, while a slow one is mostly
 * one-sided queueing delay, and averaging lets that noise drag the offset. Five
 * samples and the best-of wins is the standard trick, and it is enough.
 */
export function sampleOffset(t0: number, tServer: number): void {
  const t1 = Date.now();
  const rtt = t1 - t0;
  if (rtt >= bestRtt) return;
  bestRtt = rtt;
  offset = tServer + rtt / 2 - t1;
}

/**
 * Forget every sample. Called on each connect: the handshake re-runs per
 * connection, and a phone that slept for an hour may have had its clock stepped
 * by NTP while it was away, which would leave yesterday's offset looking
 * authoritative.
 */
export function resetClock(): void {
  bestRtt = Number.POSITIVE_INFINITY;
  offset = 0;
}

/** The measured offset, for a debug readout. Nothing should branch on it. */
export const clockOffset = (): number => offset;
