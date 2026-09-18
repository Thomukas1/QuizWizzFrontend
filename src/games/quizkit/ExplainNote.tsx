import Img from '../../primitives/Img';
import type { QuizMedia } from './view';

/**
 * **The sentence under a reveal, and the picture that goes with it.**
 *
 * All three formats with an answer key render this, and all three rendered the
 * same `<p>` before there was a picture to put beside it. One component now,
 * because the pairing is a layout decision — how big the image is against the
 * text, what happens when only one of the two is there — and three copies of it
 * would drift the first time either was touched.
 *
 * **Both halves are optional and neither implies the other.** Most items have
 * nothing here at all; some have a sentence; some have a picture whose whole
 * point is that it needs no sentence — the album cover, the face, the map. So
 * this renders nothing rather than an empty band, which is what an explanation
 * that isn't there should look like.
 *
 * `explainMedia` is one image and not a strip, which is the server's rule and
 * worth restating: this lands on a screen already carrying a correct answer,
 * bars and names, and the host is about to move on. `<MediaStrip>` is the
 * prompt's slot and can hold a pair to compare — a reveal cannot.
 *
 * It goes through `<Img>` for the same reason the strip does: a stored Arweave
 * url names one gateway, and `services/arweave/` already owns failover, retries
 * and the shimmer that hides them.
 */
export function ExplainNote({ explain, media }: { explain: string | null; media: QuizMedia | null }) {
  // Nothing to say is the common case, and the honest render is nothing at all.
  if (!explain && !media) return null;

  return (
    <div className={`quiz-explain${media && !explain ? ' quiz-explain--media-only' : ''}`}>
      {/* `kind` is switched on here and nowhere else, the same bargain
          `<MediaStrip>` and `<Avatar>` make: an audio explanation becomes a
          second member of the union and a branch in this file. */}
      {media?.kind === 'image' && (
        <Img
          className="quiz-explain__media"
          src={media.url}
          alt={media.alt ?? ''}
          // On screen the moment the reveal arrives. There is no scrolling on a
          // television, and Match-3 holds its answer for five seconds — a lazy
          // image there is an image the room never sees.
          loading="eager"
        />
      )}

      {explain && <p className="quiz-display__explain">{explain}</p>}
    </div>
  );
}
