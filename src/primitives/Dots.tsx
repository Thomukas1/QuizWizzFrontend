/**
 * An animated ellipsis — `.` `..` `...`, then round again.
 *
 * Three spans rather than an animated `content` string or a stepped `width`:
 * both of those work, but one is patchily supported and the other animates a
 * layout property. Opacity on three fixed glyphs stays on the compositor and
 * reserves its own width, so the text beside it never shifts as the dots come
 * and go.
 *
 * The literal dots stay in the DOM and the whole thing is hidden from assistive
 * tech — "Waiting for players" is the message; the animation is just a sign that
 * the screen hasn't frozen.
 */
export function Dots() {
  return (
    <span className="dots" aria-hidden="true">
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  );
}
