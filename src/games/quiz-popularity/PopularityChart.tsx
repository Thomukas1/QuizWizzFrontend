import type { CSSProperties } from 'react';
import type { PopularityBar } from './view';

/**
 * **The room, as a bar chart, arriving one column at a time.**
 *
 * This is the two seconds the whole format is carried by: everybody finds out
 * what their friends actually think and whether they read them right, in the
 * same breath. It is the only thing in this folder that isn't assembled out of
 * the quiz kit, and it is the only thing that needed to be.
 *
 * ## The server is the clock
 *
 * `bars` is a **growing prefix, lowest first** — the server holds a step per
 * column and the array is one longer on each of them. So there is no interval in
 * here, no queue and no "which bar are we on" state: a column exists or it does
 * not, and one that has just appeared plays its growth animation once, on mount.
 *
 * That matters beyond tidiness. A local timer would be a second opinion about
 * pacing, and it would restart from the first column on every frame push — and a
 * frame is pushed whenever anybody's phone so much as drops off the wifi, which
 * is exactly the bug `ScorerRoll` keeps a `rollKey` to avoid. Here the problem
 * cannot arise, because nothing is being timed on this side.
 *
 * ## The empty slots are load-bearing
 *
 * The columns that have not arrived are drawn as blanks rather than left out.
 * Two reasons, and the second is the real one:
 *
 * - The chart keeps its shape. Four columns appearing one at a time into a
 *   flexible row would re-deal every bar's width three times.
 * - **A blank cannot be read.** Laying the axis out with all four labels up
 *   front would put the finishing order on the wall before the first bar grew,
 *   since the columns are sorted by the very thing being revealed. The slots
 *   carry no label and no key until their bar lands.
 *
 * ## The height means something
 *
 * Every bar is a share of `totalVotes` — the whole room, not the tallest column.
 * Scaling to the winner would make every chart look the same and would rescale
 * the bars already standing each time a taller one arrived. A 40% column that
 * won is the honest picture of a four-way split, and reading "40%" off a bar
 * that reaches four tenths of the way up is the entire point of drawing it.
 *
 * **Nothing is crowned until the last column is up.** `crowned` is empty until
 * then and can hold more than one key — everything tied at the top wins, which
 * is the rule rather than an edge case.
 */

interface PopularityChartProps {
  /** `reveal.bars` — lowest first, and only the ones the television has shown. */
  bars: PopularityBar[];
  /** How many columns this item will end up with. Blanks until then. */
  slots: number;
  /** `reveal.totalVotes` — phase A turnout, and the denominator for a share. */
  totalVotes: number;
  /** `reveal.crowned` — winning keys, empty until every column is up. */
  crowned: string[];
}

export function PopularityChart({ bars, slots, totalVotes, crowned }: PopularityChartProps) {
  // A share of nobody is zero, not a division by zero. It happens: a room that
  // all walks out mid-question leaves a chart of four empty columns, which is
  // the correct picture of what it did.
  const shareOf = (votes: number): number => (totalVotes > 0 ? votes / totalVotes : 0);

  return (
    <div className="pop-chart" style={{ '--slots': slots } as CSSProperties}>
      <div className="pop-chart__plot">
        {Array.from({ length: slots }, (_, index) => {
          const bar = bars[index];

          // Not up yet. Deliberately anonymous — see the note above.
          if (!bar) {
            return <div key={`slot-${index}`} className="pop-chart__col pop-chart__col--empty" />;
          }

          const share = shareOf(bar.votes);
          const won = crowned.includes(bar.key);

          return (
            <div
              /**
               * Keyed by the option, not the slot. The key is what makes a
               * column's growth animation run exactly once — on the frame it
               * arrives — and never again for the rest of the reveal, however
               * many frames the server pushes behind it.
               */
              key={bar.key}
              className={`pop-chart__col${won ? ' pop-chart__col--won' : ''}`}
              style={{ '--share': share } as CSSProperties}
            >
              <div className="pop-chart__track">
                {/* The crown lands with the final column and sits above the
                    number, so a tie puts two of them on the wall at once —
                    which is the whole point of `crowned` being a list. */}
                {won && <span className="pop-chart__crown" aria-label="Most popular">👑</span>}

                {/* Above the bar rather than inside it: the fill grows with a
                    `scaleY`, and anything living in it would be stretched flat
                    and squeezed back. This just fades in as the bar arrives
                    under it. */}
                <span className="pop-chart__count">
                  <span className="pop-chart__votes">{bar.votes}</span>
                  <span className="pop-chart__share">{Math.round(share * 100)}%</span>
                </span>

                <span className="pop-chart__fill" aria-hidden="true" />
              </div>

              {/* The x axis. The letter ties the column to a button that was in
                  somebody's hand ninety seconds ago, and to the row the same
                  option had on the question screen. */}
              <div className="pop-chart__foot">
                <span className="pop-chart__key" aria-hidden="true">{bar.key}</span>
                <span className="pop-chart__label">{bar.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
