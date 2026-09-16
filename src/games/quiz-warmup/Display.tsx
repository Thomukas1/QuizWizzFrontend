import { Timer } from '../../components/Timer';
import { LockedInCount, MediaStrip, OptionGrid, ScorerRoll } from '../quizkit';
import type { DisplayProps } from '../registry';
import type { WarmupDisplayView } from './view';

/**
 * **The warmup, on the television.** Prompt dominant, options beneath it lettered
 * to match the phone, tiles along the bottom.
 *
 * It switches on `step`, and `step` alone — the four values are on the wire in
 * `view.ts` and this is the only thing that reads them. The clock does not: it is
 * handed `deadline` and branches on `kind`, which is what keeps one timer
 * component serving a quiz and a balloon-popping minigame.
 *
 * Nothing here is clever, and that is the format's whole job. Every twist in the
 * parts that follow lands harder because this one had none.
 *
 * It renders inside `<GameZone>`, so it supplies content and never layout, and
 * inherits the emoji field and the three-row frame for free.
 */
export default function WarmupDisplay({ state, players, deadline }: DisplayProps<WarmupDisplayView>) {
  const { step, item, itemIndex, itemCount, answered, expected, reveal } = state;

  // -1 means an opening or closing stage with no item up. The warmup has
  // neither — but Match-3 does, and this component should not be the thing that
  // finds that out in front of a room.
  const counter = itemIndex >= 0 ? `${itemIndex + 1} / ${itemCount}` : null;

  // The gap between entering GAME and the first item, and the beat after the
  // last one. A blank television mid-party reads as broken to fifteen people at
  // once, so it says something rather than nothing.
  if (!item) {
    return (
      <div className="quiz-display quiz-display--empty">
        <p className="subtle">Warming up…</p>
      </div>
    );
  }

  return (
    <div className="quiz-display">
      {/* The question is the top of the screen, not the middle of it: a prompt
          centred in the stage pushed the options down and left a band of empty
          zone above them. Reading it off the top-left is also how anybody reads
          anything, which matters at three metres. */}
      <header className="quiz-display__head">
        <div className={`quiz-display__billing${counter ? '' : ' quiz-display__billing--wide'}`}>
          {counter && (
            <span className="quiz-display__counter">
              <span className="quiz-display__counter-word">Question</span>
              <span className="quiz-display__counter-nums">{counter}</span>
            </span>
          )}
          <h2 className="quiz-prompt">{item.prompt}</h2>
        </div>

        {/* Full width under the question, so the clock reads as a rule drawn
            across the screen rather than a third thing in the title row. Null
            on `reveal` and hidden on the `locked` beat — the component decides
            that from the deadline's own kind, not from the step. */}
        <Timer deadline={deadline} size="lg" />
      </header>

      <div className="quiz-display__main">
        <MediaStrip media={item.media} />
        {/* `reveal` is null until its step, so the green is a fact of the frame
            rather than something this component has to be trusted to withhold. */}
        <OptionGrid options={item.options} correct={reveal?.correct ?? null} />

        {/* Directly under the choices, because it is about the one that just
            turned green. Only when the item has a sentence — a missing
            explanation is not a blank line. */}
        {reveal?.explain && <p className="quiz-display__explain">{reveal.explain}</p>}
      </div>

      {/* The footer holds exactly one thing at a time, and which one is the
          step: who the room is waiting for while the question is live, and who
          got it once it isn't. */}
      <footer className="quiz-display__foot">
        {(step === 'open' || step === 'locked') && (
          <LockedInCount answered={answered.length} expected={expected} size="lg" />
        )}

        {/* The room, one face at a time, in its own box along the bottom.
            `reveal.counts` is on the frame and deliberately unrendered: how the
            wrong answers split is a fact, and this moment belongs to the people
            who got it right. */}
        {reveal && <ScorerRoll players={players} scorers={reveal.scorers} />}
      </footer>
    </div>
  );
}
