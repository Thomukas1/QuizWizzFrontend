/**
 * **What you have made this game** — the phone's footer, and the only number on
 * it.
 *
 * Points, straight off the frame. The phone multiplies nothing and counts
 * nothing: `pointsCorrect` is server config that never crosses the wire, and a
 * client turning a tally into a score is a client with an opinion about a score.
 *
 * **It lags the answer on purpose.** `yourScore` only counts items whose answer
 * has already been shown, because a submission is marked correct the instant it
 * is recorded — so a total that moved when you tapped would be telling you that
 * you were right while the rest of the room was still deciding. The number
 * holding still after a tap is the feature. Do not smooth it, and do not
 * animate it forward optimistically.
 *
 * It is also where a refusal lands. The phone has one status surface now, and a
 * rare sentence borrowing the label is better than a line that appears from
 * nowhere and pushes three buttons down the screen under a moving thumb.
 */
interface ScorePanelProps {
  /** `state.yourScore`, already in points. */
  points: number;
  /** This player scored on the item just revealed — the panel lights up. */
  scored: boolean;
  /** A refusal, shown in place of the label. Null almost always. */
  note?: string | null;
}

export function ScorePanel({ points, scored, note }: ScorePanelProps) {
  /**
   * **A number, whatever arrived.**
   *
   * `points` is typed `number`, so a non-number means the frame and this build
   * disagree — a game whose state was created by an older server, most likely
   * one `persistence` restored across a deploy. That produces `NaN` on the
   * server, which `JSON.stringify` ships as `null`, which React renders as
   * nothing at all: a panel reading "pts" with no figure in front of it.
   *
   * Guarded because the blank is the worse failure. It is silent either way,
   * and a bank that reads zero at least looks like a bank.
   */
  const figure = Number.isFinite(points) ? points : 0;

  return (
    <div
      className={`score-panel${scored ? ' score-panel--scored' : ''}${note ? ' score-panel--note' : ''}`}
      role="status"
    >
      <span className="score-panel__label">{note ?? 'This round'}</span>
      {/* The unit is its own span so it can be dimmed away from the number —
          the figure is what a thumb glances at between questions, and "pts" is
          only there to say what it is. */}
      <span className="score-panel__points">
        {figure}
        <span className="score-panel__unit">pts</span>
      </span>
    </div>
  );
}
