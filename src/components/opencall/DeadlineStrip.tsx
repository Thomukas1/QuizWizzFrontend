import { Countdown } from '../../primitives/Countdown';

interface Props {
  /** ISO timestamp submissions shut at. */
  deadline: string;
  /** Refetch, so the closed window comes back from the server rather than
   *  being assumed client-side. */
  onExpire: () => void;
}

// The "closing in" countdown pinned above the submission form: how long is left
// to get one in, in a pulsing red so a room can't miss it
// (styles/deadline-strip.css). Rendered by `OpenCall` alone, which is why it
// lives here — a jam and a mixtape shut the same way.
export default function DeadlineStrip({ deadline, onExpire }: Props) {
  return (
    <div className="deadline-strip">
      <span>Closing in:</span>
      <Countdown
        target={deadline}
        onExpire={onExpire}
        render={r => <span className="deadline-strip__time">{r}</span>}
      />
    </div>
  );
}
