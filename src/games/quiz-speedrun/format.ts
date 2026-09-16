/**
 * Two small renderers this format needs on both screens.
 *
 * Decoration, not protocol — the wire carries a number and a duration, and how
 * they read is this folder's business. Nothing here is copied from the server.
 */

/** `3` → `3rd`. The place badge, the phone's verdict, the middle of the circle. */
export const ordinal = (n: number): string => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

/**
 * `4213` → `4.21s`.
 *
 * **Two decimals, always.** Concrete numbers are what make a place feel earned
 * rather than arbitrary, and a near miss is far more fun when you can see how
 * near — `4.21` beside `4.88` is the whole payoff of the format. Rounding to
 * tenths throws away exactly the digit that makes two of them different.
 */
export const seconds = (ms: number): string =>
  Number.isFinite(ms) ? `${(ms / 1000).toFixed(2)}s` : '—';
