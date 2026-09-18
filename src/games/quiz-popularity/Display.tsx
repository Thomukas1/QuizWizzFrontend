import { Timer } from '../../components/Timer';
import {
  COUNTDOWN_STEP,
  Countdown,
  GameRules,
  LockedInCount,
  OptionGrid,
  QuestionMedia,
  RULES_STEP,
  ScorerRoll,
} from '../quizkit';
import type { DisplayProps } from '../registry';
import { PopularityChart } from './PopularityChart';
import type { PopularityDisplayView, PopularityPhase } from './view';

/**
 * **Popularity, on the television.** The same four options twice, and then the
 * room's own answer arriving one column at a time.
 *
 * ## Two screens, and the frame says which
 *
 * `reveal` is null through both questions and an object from the first column
 * of the chart onward, so it is the switch — the same move Speedrun makes with
 * `reveal.crowd`. Nine step ids and two layouts would be eight chances to get a
 * branch wrong, and the frame already answers the question in the one field
 * whose whole purpose is to answer it.
 *
 * **There is no tally in the frame before that.** Not zeroed, not hidden by a
 * class — absent, because the server never put it there. Nothing on this screen
 * is being trusted to keep a secret, which is the only way to run a format whose
 * entire premise is that the room does not know its own mind yet.
 *
 * ## The two questions have to look different
 *
 * The same four options are asked about twice inside ninety seconds, and the
 * second question is not the first one repeated — it is "what did everybody
 * *else* say". A room that doesn't notice the change answers the second one on
 * autopilot with the first answer, and the format quietly becomes a slower
 * warmup with no scoring.
 *
 * So `phase` drives an accent and a kicker, and the server hands it over rather
 * than leaving this to guess from the step: it flips to `prediction` on the
 * `switch` beat, one whole step *before* the buttons go live, which is the beat
 * existing so the room can read the change before it can act on it.
 *
 * It renders inside `<GameZone>`, so it supplies content and never layout.
 */

/** What the television calls each half. Copy, and copy belongs to this side. */
const ASK: Record<PopularityPhase, { kicker: string; hint: string }> = {
  opinion: { kicker: 'Pick honestly', hint: 'No points. Nobody sees this.' },
  prediction: { kicker: 'Now — what did the room pick?', hint: 'Guess the winner for 2 points.' },
};

export default function PopularityDisplay({ state, players, deadline }: DisplayProps<PopularityDisplayView>) {
  const { step, item, itemIndex, itemCount, answered, expected, open, phase, reveal } = state;

  const counter = itemIndex >= 0 ? `${itemIndex + 1} / ${itemCount}` : null;

  /**
   * **The opening pair, and this format cannot be played without it.**
   *
   * Every other rules card in the set is a courtesy — the room could work the
   * format out from the first reveal. This one is load-bearing: the premise is
   * that the same four options get asked about twice and only the second one
   * pays, and somebody who has not been told that answers the prediction with
   * their own opinion and never finds out why they scored nothing. `ASK` and the
   * accent switch exist to carry that *during* the round; this is where it gets
   * said in full, once, with no clock running.
   *
   * Neither step is in the server's plan yet: `PopularityStep` has no `rules`
   * and no `countdown`, hence the kit's widened ids rather than literals.
   */
  if (step === RULES_STEP) {
    return (
      <GameRules title="Popularity">
        <p>Two questions, the same four answers.</p>
        <p>First: what do you actually think? That one is worth nothing.</p>
        <p>Then: what did the room pick most? That is the one that pays.</p>
      </GameRules>
    );
  }

  if (step === COUNTDOWN_STEP) {
    return <Countdown deadline={deadline} />;
  }

  if (!item) {
    return (
      <div className="quiz-display quiz-display--empty">
        <p className="subtle">Reading the room…</p>
      </div>
    );
  }

  // The accent the whole screen is tinted by. Null through the chart, where
  // neither question is live any more and the colour belongs to the result.
  const tone = phase ?? 'reveal';
  const ask = phase ? ASK[phase] : null;

  return (
    <div className={`quiz-display popularity popularity--${tone}`}>
      <header className="quiz-display__head">
        <div className={`quiz-display__billing${counter ? '' : ' quiz-display__billing--wide'}`}>
          {counter && (
            <span className="quiz-display__counter">
              <span className="quiz-display__counter-word">Question</span>
              <span className="quiz-display__counter-nums">{counter}</span>
            </span>
          )}

          <div className="popularity__ask">
            {/* Which of the two is being asked, above the prompt rather than
                inside it: the prompt is the same sentence both times and the
                thing that changed is what you are meant to do with it. */}
            {ask && <span className="popularity__kicker">{ask.kicker}</span>}
            <h2 className="quiz-prompt">{item.prompt}</h2>
          </div>
        </div>

        {/* Hidden of its own accord on every beat in this format — the switch
            and all four columns are `beat` deadlines, and the component decides
            that from the kind rather than from the step. */}
        <Timer deadline={deadline} size="lg" />
      </header>

      <div className="quiz-display__main">
        {reveal ? (
          <PopularityChart
            bars={reveal.bars}
            // The item's own option count, so the axis holds its shape from the
            // first column instead of re-dealing itself three times.
            slots={item.options.length}
            totalVotes={reveal.totalVotes}
            crowned={reveal.crowned}
          />
        ) : (
          <>
            {/* The chart replaces the whole middle band on the reveal, so this
                format needs no rule about hiding the picture — the branch it is
                inside is already the one that isn't a reveal. */}
            <QuestionMedia media={item.media} />
            {/* No `correct` prop, ever. This is the one format where the item on
                disk has no answer on it — the room is about to be the answer —
                so there is nothing for the grid to turn green. */}
            <OptionGrid options={item.options} />
          </>
        )}
      </div>

      <footer className="quiz-display__foot">
        {/* Who the room is waiting for, on whichever question is live. `open`
            rather than a list of step ids: it is false through the intro, the
            switch beat and the whole reveal, which is exactly when there is
            nobody to wait for. */}
        {open && <LockedInCount answered={answered.length} expected={expected} size="lg" />}
        {!open && ask && <p className="popularity__hint">{ask.hint}</p>}

        {/*
          **Null until the names go up, and empty is a real answer.**

          `scorers` is null through every column of the chart and a list on the
          step after the last one, so this appears a beat after the crown — the
          gap where the room is working out whether it read itself right. An
          empty list means it didn't, which on this format is the best possible
          outcome and gets said out loud.
        */}
        {reveal?.scorers && (
          <ScorerRoll
            players={players}
            scorers={reveal.scorers}
            header="Called it:"
            nobody="Nobody saw that coming"
          />
        )}
      </footer>
    </div>
  );
}
