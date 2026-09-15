import type { OpenCallPhase, RequestStatus } from '../../services/slopbop';
import SongWriter from '../songwriter/SongWriter';
import DeadlineStrip from './DeadlineStrip';
import { Countdown } from '../../primitives/Countdown';

// The wording, supplied by the page: we own the machine, it owns the voice. An
// omitted slot renders nothing, which is the right answer for a state a page has
// no words for. No `resolved` — the page shows the winner or the finished tape
// there instead.
export interface OpenCallCopy {
  /** A line, above the countdown to the opening. */
  scheduled?: React.ReactNode;
  /** A line, above the deadline strip and the writer. */
  pitch: React.ReactNode;
  /** Whole blocks — see `Notice`. */
  full?: React.ReactNode;
  awaiting?: React.ReactNode;
  closed?: React.ReactNode;
}

interface Props {
  collectionId: string;
  /** The evaluated window. Decides only whether the writer is on screen. */
  status: RequestStatus;
  phase: OpenCallPhase;
  copy: OpenCallCopy;
  /** Did the page render anything above us — draws our top divider. Ours because
   *  only we know whether we render at all, and a divider over nothing is a
   *  stray line. */
  hasContentAbove?: boolean;
  /** Refetch so the window is re-evaluated (a countdown hits, a 409 closes it). */
  refresh: () => void;
}

/**
 * The open call: one submission window, shared by mixtapes and jams.
 *
 *   scheduled            → countdown to the opening
 *   open, door open      → the pitch, the closing countdown, and the form card
 *   open, filled up      → `copy.full`
 *   awaiting_resolution  → `copy.awaiting`
 *   closed               → `copy.closed`
 *   resolved             → nothing; the page owns that one
 *   anything else        → nothing (e.g. never configured with max_tracks)
 *
 * Nothing here knows which kind of collection it's rendering, and it shouldn't:
 * a jam and a mixtape differ only *after* `awaiting_resolution`, which is the
 * one thing this panel doesn't handle.
 */
export default function OpenCall({
  collectionId,
  status,
  phase,
  copy,
  hasContentAbove = false,
  refresh,
}: Props) {
  let body: React.ReactNode = null;

  if (phase === 'scheduled') {
    body = (
      <div className="frosted-card flex flex-col items-center gap-sm text-center">
        {copy.scheduled}
        {status.submission_start ? (
          <Countdown
            target={status.submission_start}
            onExpire={refresh}
            render={r => <span className="text-2xl font-bold text-accent">{r}</span>}
          />
        ) : (
          <p className="text-xs text-muted">Check back soon.</p>
        )}
      </div>
    );
  } else if (phase === 'open' && status.open) {
    // The pitch sits above the form card, which carries its own count header —
    // keeping copy out of it is what lets the card serve both types.
    body = (
      <div className="flex flex-col gap-md">
        {copy.pitch}
        {status.submission_deadline && (
          <DeadlineStrip deadline={status.submission_deadline} onExpire={refresh} />
        )}
        <SongWriter collectionId={collectionId} status={status} oncePerDevice refresh={refresh} />
      </div>
    );
  } else if (phase === 'open' && status.reason === 'full') {
    // `reason`-gated, not a bare `else`: a call with no capacity is also `open`
    // with a shut door, and "all null slots are taken" isn't the thing to say.
    body = copy.full ?? null;
  } else if (phase === 'awaiting_resolution') {
    body = copy.awaiting ?? null;
  } else if (phase === 'closed') {
    body = copy.closed ?? null;
  }

  if (!body) return null;

  return (
    <>
      {hasContentAbove && <div className="border-t border-divider" />}
      {body}
    </>
  );
}
