/**
 * When a load is written off and another gateway is asked.
 *
 * Internal to this folder — the handlers next door apply these, and nothing
 * outside imports them. Gateways fail *slowly*: a sick one answers 504 after
 * ~15s and a stalled redirect can run past 40s, so nothing here waits for an
 * error. Silence is observable immediately; failure is not.
 */

/** Extra attempts after the first, once every gateway has been swept. */
export const MAX_RETRIES = 2;

/** Pause before a retry sweep. Long enough not to hammer, short enough not to be felt. */
export const RETRY_DELAY_MS = 500;

/**
 * How long a load may produce *no bytes at all* before we route it elsewhere.
 * Sits in the gap the measurements left — a healthy gateway delivered first
 * bytes in ~1-1.7s, a sick one delivered nothing for 15s. Erring short is cheap:
 * a false positive costs one host swap, not a failed play.
 */
export const FIRST_BYTE_MS = 2_500;

/**
 * How long a load that *has* started may go silent before it counts as dead.
 * Measures silence, not slowness — pushed forward by every `progress` event, so
 * a weak connection dragging ~1MB over a minute never trips it.
 */
export const STALL_SILENCE_MS = 20_000;

/**
 * Images have no `progress` event, so there's no first-byte signal — only "still
 * not loaded". Generous enough not to yank a slow phone to another host, short
 * enough to beat the gateway's own ~15s timeout.
 */
export const IMAGE_SWAP_MS = 8_000;
