import { useEffect, useState } from 'react';
import Img from '../../primitives/Img';

interface Props {
  coverUrl?: string;
  title?: string;
  /** Real-world UTC release timestamp (ISO-8601 "Z"). */
  releaseDate: string;
  /**
   * Fired when the countdown crosses zero, and periodically thereafter until
   * this card unmounts. The parent should re-fetch: the song's audio genuinely
   * isn't on the client until release, so the server has to hand back the
   * now-`released` song with its media before it can become a playable row.
   */
  onReleaseElapsed: () => void;
}

/** "1d 2h 3m 4s" — leading zero units dropped, from the first non-zero unit down. */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const parts = [
    ['d', Math.floor(total / 86400)],
    ['h', Math.floor((total % 86400) / 3600)],
    ['m', Math.floor((total % 3600) / 60)],
    ['s', total % 60],
  ] as const;
  const firstNonZero = parts.findIndex(([, v]) => v > 0);
  const from = firstNonZero === -1 ? parts.length - 1 : firstNonZero; // always show at least "0s"
  return parts.slice(from).map(([u, v]) => `${v}${u}`).join(' ');
}

// How often to re-poll for the release once the countdown has elapsed but the
// server hasn't handed back the released song yet (clock skew / publish lag).
const RETRY_MS = 15000;

/**
 * A not-yet-released song, shown as a "developing" tile: SingleCard's row with
 * a blurred cover, a light chasing around the outline, and a live countdown to
 * `release_date`. Owns its own 1s tick; once the moment passes it asks the
 * parent to re-fetch (which is what actually reveals the song, since the audio
 * isn't downloaded until release).
 */
export default function ProcessingCard({ coverUrl, title, releaseDate, onReleaseElapsed }: Props) {
  const target = Date.parse(releaseDate);
  const [remaining, setRemaining] = useState(() => target - Date.now());
  const elapsed = remaining <= 0;

  useEffect(() => {
    const tick = () => setRemaining(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  // Once elapsed, poll the parent until the released song arrives and this card
  // is unmounted. onReleaseElapsed is expected to be stable (see SongList).
  useEffect(() => {
    if (!elapsed) return;
    onReleaseElapsed();
    const id = setInterval(onReleaseElapsed, RETRY_MS);
    return () => clearInterval(id);
  }, [elapsed, onReleaseElapsed]);

  return (
    <div className="processing-card" aria-live="polite">
      <div className="processing-card__inner">
        <Img
          src={coverUrl || '/Images/default_song_cover.png'}
          alt=""
          className="processing-card__cover"
        />
        <div className="processing-card__body">
          {title && <p className="processing-card__title">{title}</p>}
          <span className="processing-card__count">
            {elapsed ? (
              <span className="processing-card__time">Releasing…</span>
            ) : (
              <>Releases in: <span className="processing-card__time">{formatCountdown(remaining)}</span></>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
