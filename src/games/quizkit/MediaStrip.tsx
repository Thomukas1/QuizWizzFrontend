import type { CSSProperties } from 'react';
import Img from '../../primitives/Img';
import { MAX_MEDIA_PER_ITEM } from './view';
import type { QuizMedia } from './view';

/**
 * **The slot beside a prompt** — a photo to identify, a pair to compare.
 *
 * **Empty on every item today.** Nothing hosts the bytes yet, so this renders
 * nothing and is built anyway: with the slot here, the first illustrated round
 * is a content change rather than a refactor of two components and a stylesheet.
 *
 * It goes through `<Img>` rather than a bare `<img src>`, and that is the point
 * of the detour. A stored Arweave url names one gateway; betting a round on that
 * host being up is a blank screen in front of fifteen people, and
 * `services/arweave/` already solves gateway failover, retries and the shimmer
 * that hides them. A raw `src` would be a second, worse copy of all of it.
 *
 * `kind` is switched on **here and nowhere else**, the same bargain `<Avatar>`
 * makes: `QuizMedia` is a tagged union so an audio clip becomes a second member
 * and a branch in this file, with no change to `QuizItemView` or to any render
 * site.
 */
export function MediaStrip({ media }: { media: QuizMedia[] }) {
  // Nothing to show is the common case and the honest render is nothing at all
  // — an empty frame beside a prompt reads as an image that failed to load.
  if (media.length === 0) return null;

  // A prompt plus two references is a screen; three is a collage nobody reads.
  // Clamped for layout only, so a third would shrink rather than break the row.
  const columns = Math.min(media.length, MAX_MEDIA_PER_ITEM);

  return (
    <div className="media-strip" style={{ '--media-columns': columns } as CSSProperties}>
      {media.map((entry, index) =>
        entry.kind === 'image' ? (
          <Img
            key={`${entry.url}-${index}`}
            className="media-strip__frame"
            src={entry.url}
            alt={entry.alt ?? ''}
            // On screen the moment the step arrives — there is no scrolling on
            // a television and a lazy question image is a late question image.
            loading="eager"
          />
        ) : null,
      )}
    </div>
  );
}
