import { Timer } from '../../components/Timer';
import {
  COUNTDOWN_STEP,
  Countdown,
  ExplainNote,
  GameRules,
  LockedInCount,
  OptionGrid,
  QuestionMedia,
  RULES_STEP,
  ScorerRoll,
} from '../quizkit';
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

  /**
   * **The opening pair, and the format's own words in the kit's card.**
   *
   * The warmup's rules are the shortest in the set on purpose: it is the round
   * that teaches the rhythm, and everything it says here is something the next
   * three formats will break. Nothing is computed — no number on this screen
   * comes off the frame, because the warmup pays a flat point and says so.
   *
   * These two steps are **not in the server's plan yet** — `WarmupStep` has no
   * `rules` and no `countdown`, which is why the ids are compared against the
   * kit's widened constants rather than literals. Declare them as `opening`
   * steps in the server module and this lights up with nothing else to change.
   */
  if (step === RULES_STEP) {
    return (
      <GameRules title="Warmup">
        <p>Four answers. One of them is right.</p>
        <p>Everyone gets the same clock, and being quick about it buys you nothing.</p>
      </GameRules>
    );
  }

  if (step === COUNTDOWN_STEP) {
    return <Countdown deadline={deadline} />;
  }

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
        {/* **Gone the moment the answer lands.** The reveal brings a row of
            faces along the bottom and, on some items, a picture of its own, and
            the question's picture has already done its job by then — it is the
            one thing on this screen nobody is looking at any more. Dropping it
            is what pays for the two that arrive. */}
        {!reveal && <QuestionMedia media={item.media} />}

        {/* `reveal` is null until its step, so the green is a fact of the frame
            rather than something this component has to be trusted to withhold.

            `correctOnly` on the items that reveal a picture: that picture is the
            beat, and four rows the room read thirty seconds ago are what it
            would be sharing the screen with. */}
        <OptionGrid
          options={item.options}
          correct={reveal?.correct ?? null}
          correctOnly={!!reveal?.explainMedia}
        />

        {/* Directly under the choices, because it is about the one that just
            turned green. The component renders nothing when the item has
            neither a sentence nor a picture — a missing explanation is not a
            blank line — so there is no guard to keep in step here. */}
        <ExplainNote explain={reveal?.explain ?? null} media={reveal?.explainMedia ?? null} />
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
