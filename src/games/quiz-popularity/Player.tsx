import { Timer } from '../../components/Timer';
import { OptionButtons, ScorePanel, useAnswerLock } from '../quizkit';
import type { PlayerProps } from '../registry';
import type { PopularityPhase, PopularityPlayerView } from './view';

/**
 * **Popularity, in a hand.** The same four buttons twice, and the only thing
 * that changes is what they mean.
 *
 * That sentence is also the whole design problem. A phone that looks identical
 * for both questions gets the second one answered on autopilot with the first
 * answer, and the format collapses — so the buttons change colour, the header
 * changes its sentence, and the answer already given stays on screen as a
 * reminder rather than as the state of the buttons.
 *
 * ## `phase` is the switch, and it arrives early on purpose
 *
 * The server flips it on the `switch` beat, a whole step before the prediction
 * opens. So the repaint happens while the buttons are still dead: nobody's thumb
 * lands on a freshly-recoloured button, which is the one thing that beat exists
 * to prevent.
 *
 * ## Two answers, one item
 *
 * This is the only format where the same `itemId` is answered twice, which is
 * what `round` on `useAnswerLock` is for. Without it the hook's own memory of
 * the first answer matches the second question — same item — and the phone opens
 * phase B with every button dead and a locked-in answer nobody can change. The
 * round scopes what is remembered; the item is still what gets sent.
 *
 * ## What it is told, and when
 *
 * `outcome` is null until the chart's last column lands, at which point the
 * television has already shown the whole room the answer — so nothing here is
 * ever ahead of the wall. `points` stays 0 for one more beat, until the names go
 * up, which is when `yourScore` moves too.
 */

/** Copy, which belongs to this side. Two sentences, and they are the format. */
const ASK: Record<PopularityPhase, { title: string; note: string }> = {
  opinion: { title: 'What do you think?', note: 'Honestly. This one is worth nothing.' },
  prediction: { title: 'What did the room think?', note: 'Guess the most popular for a point.' },
};

export default function PopularityPlayer({ state, deadline, answer }: PlayerProps<PopularityPlayerView>) {
  const { itemIndex, itemCount, itemId, options, open, yourChoice, yourOpinion, phase, outcome, yourScore } = state;

  const { chosen, pending, notice, pick } = useAnswerLock({
    itemId,
    // The attempt, not just the item. See the note above — this is the whole
    // reason the second question's buttons are usable at all.
    round: phase,
    yourChoice,
    open,
    answer,
  });

  if (!itemId) {
    return (
      <div className="quiz-player quiz-player--waiting">
        <p className="subtle">Watch the big screen…</p>
      </div>
    );
  }

  const ask = phase ? ASK[phase] : null;

  return (
    <div className={`quiz-player popularity-player popularity-player--${phase ?? 'reveal'}`}>
      <header className="quiz-player__head">
        <span className="quiz-player__counter">
          {itemIndex >= 0 ? `Question ${itemIndex + 1} / ${itemCount}` : 'Popularity'}
        </span>
        <Timer deadline={deadline} size="sm" />
      </header>

      {/* Which question these buttons are, in one line, right above them. The
          television is saying the same thing three metres away — but this is the
          one format where the two questions are answered on identical controls,
          and the person holding the phone is looking down at it when the second
          one opens. */}
      {ask && (
        <div className="popularity-player__ask">
          <span className="popularity-player__title">{ask.title}</span>
          <span className="popularity-player__note">{ask.note}</span>
        </div>
      )}

      {/*
        The accent comes from the wrapper's `--phase` class rather than a prop,
        so the kit's button stays the kit's button. `open` is the server's word
        on whether they are live and is false through the intro, the switch beat
        and the whole reveal.
      */}
      <OptionButtons
        options={options}
        chosen={chosen}
        pending={pending}
        disabled={!open}
        onPick={pick}
        outcome={outcome?.result ?? null}
      />

      {/* **The reminder line.** Their own phase A answer, which is the one thing
          about the tally a phone is allowed to know early, because it is theirs.
          It appears the moment the second question does and stays through the
          reveal — without it, "did I pick the fox or the squirrel" is a question
          people genuinely cannot answer ninety seconds later. */}
      {yourOpinion && phase !== 'opinion' && (
        <p className="popularity-player__recall">
          You picked <strong>{options.find(option => option.key === yourOpinion)?.label ?? yourOpinion}</strong>
        </p>
      )}

      {/* Points, off the frame, counting only items whose scorers the television
          has already put up. It lights up on that same beat. */}
      <ScorePanel points={yourScore} scored={(outcome?.points ?? 0) > 0} note={notice} />
    </div>
  );
}
