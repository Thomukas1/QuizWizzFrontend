import { SocialLinks } from '../../primitives/SocialLinks';
import { PROJECT_SOCIALS } from '../../config/socials';
import { useArweaveMedia } from '../../hooks/arweave';

const VIDEO_URL = 'https://turbo-gateway.com/yClTzZ-peMxVUmemE0yLjW5QsFANaYIK77rNTSUW8qM';

// A frame lifted straight out of that video (1.5s in), so the still and the
// first thing you see on play are the same shot. Lives here rather than on
// Arweave because preload="none" means this is the only thing that loads for
// anyone who never taps play — it should be local and small.
const POSTER_URL = '/Images/prize-video-poster.webp';

/**
 * The winning song from a real run, playing in-page as proof the prize is an
 * actual published video rather than a promise.
 *
 * Self-hosted rather than a TikTok/Instagram embed: those players exist to
 * advertise the platform, so they drag in profile headers, like counters and a
 * third-party script, none of which can be styled away. A plain <video> is our
 * design, and the "see more" links below carry the proof-of-publication signal
 * the platform chrome used to.
 *
 * preload="none" is what makes a large file free: nothing is fetched until the
 * viewer actually taps play, so the weight never lands on page load. Arweave's
 * gateway serves range requests, so playback streams and seeks from there
 * instead of pulling the whole file down first.
 *
 * The source comes from `useArweaveMedia` rather than a `src` attribute, so a
 * gateway that stops serving is routed around exactly like a song is — failing
 * over *is* reassigning `src`, and JSX setting it back would undo that.
 */
export function PrizeVideo() {
  const video = useArweaveMedia<HTMLVideoElement>(VIDEO_URL);

  return (
    // One width owner: the frame sets the column and the row below inherits it,
    // so "see more" and the icons land on the video's own edges.
    <div className="w-full max-w-[325px] mx-auto flex flex-col gap-lg">
      <video
        ref={video.ref}
        poster={POSTER_URL}
        controls
        playsInline
        // Not "none": with nothing loaded the browser doesn't know the file has
        // an audio track, so it greys out the volume control on the poster and
        // the video looks silent before you ever press play. "metadata" fetches
        // only the moov header — ~17KB, and it sits at the front of the file
        // (faststart), so the 10MB body still waits for an actual play.
        preload="metadata"
        // 2:3 is the house ratio every video is cut to, so the box is fixed to
        // it rather than to this one file's dimensions — swap the source and
        // the layout still holds. Sources land near it rather than exactly on
        // it (this one is 800x1168), and object-cover absorbs the ~1% that
        // doesn't fit. Fixing the box also holds the layout still while the
        // metadata is in flight, so the section can't jump once the real
        // dimensions land.
        className="w-full aspect-[2/3] object-cover rounded-lg border border-border bg-surface"
      />

      <div className="flex items-center justify-between gap-lg">
        <p className="eyebrow">See more on:</p>
        <SocialLinks socials={PROJECT_SOCIALS} />
      </div>
    </div>
  );
}
