/**
 * The logo in the middle of a QR code — the one thing the app's codes and the
 * printed sticker codes genuinely share.
 *
 * Everything else about the two is deliberately different (see the note on
 * `CollectionDisplay`), and this doesn't try to unify it: no colours, no error
 * correction level, no margin. It owns one calculation, because that
 * calculation has a trap in it.
 *
 * **The trap:** `qrcode.react` takes `imageSettings.width`/`height` in *pixels
 * relative to the `size` prop*, not in modules — internally it scales them by
 * `numCells / size`. So the same `width: 32` is a different-sized logo on a
 * `size={100}` code than on a `size={128}` one. Two call sites passing
 * different sizes would silently drift apart. Here the logo is a *fraction* of
 * the code and the pixels are derived, so both land identically.
 *
 * **Why the asset is square:** the library hardcodes
 * `preserveAspectRatio="none"` on the `<image>`, so a non-square source forced
 * into a square box gets stretched. `logo-small.png` is a 256×256 canvas with
 * the landscape wordmark letterboxed inside it, which means a square box is
 * always correct and there is no aspect ratio to thread through here. Don't
 * point this at `logo.png` (2037×1511) — it will distort.
 */

/** Where the mark lives. Square canvas — see the note above before swapping it. */
export const QR_LOGO_SRC = '/Branding/logo-small.png';

/**
 * Fraction of the code's width the logo box occupies.
 *
 * `excavate` blanks every module under that box, so this is damage: at 0.24 it
 * costs ~5.8% of the code's area. Level H absorbs ~30%, which is the whole
 * reason a logo obliges the caller to be on H — **level M will not take this.**
 * The visible mark is smaller again (the wordmark is 74% of its square canvas's
 * height), so the excavated square reads as a clean gutter around it rather
 * than as modules crowding the logo.
 */
const LOGO_SCALE = 0.24;

/**
 * `imageSettings` for a code of `size` pixels.
 *
 * Pass the **same** `size` you pass the component — that's the frame of
 * reference the library scales against, and disagreeing with it is the drift
 * this function exists to prevent.
 *
 * `src` is a parameter rather than a constant because the two callers can't
 * share one: the app serves the PNG over HTTP, while a printed SVG has to carry
 * it inline as a data URI or it renders as a broken image the moment the file
 * leaves the machine that made it.
 */
export function qrLogoSettings(size: number, src: string = QR_LOGO_SRC) {
  const box = Math.round(size * LOGO_SCALE);
  return { src, width: box, height: box, excavate: true };
}
