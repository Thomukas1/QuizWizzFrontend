import Img from '../../primitives/Img';
import type { QuizMedia } from './view';

/**
 * **The picture the question is about**, between the clock and the options.
 *
 * **One image, and only the first.** The wire type is a list and the kit still
 * allows two — see `MAX_MEDIA_PER_ITEM` — but a pair to compare is a layout with
 * its own answer to "how big is each of these", and no item ships one yet. Taking
 * `media[0]` is the honest version of what this renders today; the day a compare
 * item exists, the branch belongs here and nothing above it changes.
 *
 * It goes through `<Img>` rather than a bare `<img src>`, and that is the point
 * of the detour. A stored Arweave url names one gateway; betting a round on that
 * host being up is a blank screen in front of fifteen people, and
 * `services/arweave/` already solves gateway failover, retries and the shimmer
 * that hides them. A raw `src` would be a second, worse copy of all of it.
 *
 * **The frame hugs the picture at whatever shape it turns out to be.** Content
 * images are portrait, landscape and square in the same round, so `.quiz-media`
 * puts the image in flow and lets it size the box rather than cropping it into a
 * fixed ratio — which is what makes a border and a shadow read as a frame around
 * a photograph instead of a mat around a crop. The sizing is in the stylesheet;
 * nothing here measures anything.
 *
 * `kind` is switched on **here and nowhere else**, the same bargain `<Avatar>`
 * makes: `QuizMedia` is a tagged union so an audio clip becomes a second member
 * and a branch in this file, with no change to `QuizItemView` or to any render
 * site.
 */
export function QuestionMedia({ media }: { media: QuizMedia[] }) {
  const first = media[0];

  // Nothing to show is still the common case, and the honest render is nothing
  // at all — an empty frame under a prompt reads as an image that failed to
  // load. A future non-image first entry lands here too, which is the right
  // place for it to be silently skipped rather than to throw on a television.
  if (first?.kind !== 'image') return null;

  return (
    <Img
      className="quiz-media question-media"
      // Contain, never cover: the whole picture is the question. Cropping it is
      // how "what is this object" becomes unanswerable.
      imgClassName="object-contain"
      src={first.url}
      alt={first.alt ?? ''}
      // On screen the moment the step arrives — there is no scrolling on a
      // television and a lazy question image is a late question image.
      loading="eager"
    />
  );
}
