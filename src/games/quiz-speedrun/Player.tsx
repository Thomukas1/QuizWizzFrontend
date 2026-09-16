import { Timer } from '../../components/Timer';
import { OptionButtons, ScorePanel, useAnswerLock } from '../quizkit';
import type { PlayerProps } from '../registry';
import { ordinal, seconds } from './format';
import type { SpeedrunOutcome, SpeedrunPlayerView } from './view';

/**
 * **Speedrun, in a hand.** The warmup's three buttons, and a verdict that
 * arrives in instalments.
 *
 * **This is the one quiz where the phone says how you did in words**, and the
 * exception is the format rather than a change of mind. In the warmup the
 * television says "not this time" once, to everybody, with the answer beside it,
 * and a phone repeating that is a line of text landing under a thumb at the
 * moment the room is looking up. Here the sentence is not *whether* — the
 * buttons already said that a step ago — it is **by how much**, and that is a
 * different fact for every person holding a phone. Fifteen people cannot be told
 * "you were fourth by a tenth of a second" from three metres away.
 *
 * ## The pacing is the point
 *
 * `outcome` fills in as the television does, and never ahead of it:
 *
 * | | |
 * |---|---|
 * | before the reveal | `outcome` is null. Not zeroed — absent. |
 * | the `answer` step | `result` only. Right or wrong, nothing about placing. |
 * | each `podium` step | `place` and `points`, **on the step that shows that place**. |
 * | `final` | every place that was going to be shown has been. |
 *
 * That is all the server's doing, and the reason it matters is the crowd step:
 * a phone reading "you were 4th" while the ring is still full has spoiled the
 * format for whoever is holding it and for anyone stood next to them. So this
 * component's job is to render what it is handed and never to guess the rest —
 * in particular **"too slow" is only safe once `final` is true**, because before
 * that a null place means "not yet", not "never".
 *
 * `yourScore` ticks on the podium step that names you, which is the same instant
 * the room finds out. It is the server's number; nothing here multiplies.
 */

/**
 * The verdict, in three sentences and a silence.
 *
 * Null means say nothing: the option buttons are already coloured by `result`,
 * and a phone that adds "wrong" underneath is telling somebody off.
 */
interface Verdict {
  text: string;
  tone: 'money' | 'near';
  /**
   * Your own time. Null means they never answered — which the verdict has
   * already said, so there is nothing to print.
   */
  time: string | null;
}

function verdictOf(outcome: SpeedrunOutcome): Verdict | null {
  const time = outcome.elapsedMs === null ? null : seconds(outcome.elapsedMs);

  // In the money. The place is on screen three metres away at this exact moment.
  if (outcome.place !== null) {
    return { text: `${ordinal(outcome.place)} · +${outcome.points}`, tone: 'money', time };
  }

  if (outcome.result !== 'correct') return null;

  // Right, and the podium has not reached you. **Only `final` makes this "never"**
  // — the same null before then means the television has more places to show.
  return outcome.final
    ? { text: 'Correct — too slow', tone: 'near', time }
    : { text: 'Correct…', tone: 'near', time };
}

export default function SpeedrunPlayer({ state, deadline, answer }: PlayerProps<SpeedrunPlayerView>) {
  const { itemIndex, itemCount, itemId, options, open, yourChoice, outcome, yourScore } = state;

  const { chosen, pending, notice, pick } = useAnswerLock({ itemId, yourChoice, open, answer });

  if (!itemId) {
    return (
      <div className="quiz-player quiz-player--waiting">
        <p className="subtle">Watch the big screen…</p>
      </div>
    );
  }

  const verdict = outcome ? verdictOf(outcome) : null;

  return (
    <div className="quiz-player">
      <header className="quiz-player__head">
        <span className="quiz-player__counter">
          {itemIndex >= 0 ? `Question ${itemIndex + 1} / ${itemCount}` : 'Speedrun'}
        </span>
        <Timer deadline={deadline} size="sm" />
      </header>

      {/*
        `open` is the server's word on whether the buttons are live, and it is
        false through the intro, the lock and all five reveal steps. The deadline
        passing is deliberately not part of it: the server accepts up to
        SUBMIT_GRACE_MS past `endsAt` and ranks a late arrival like any other, so
        a slow connection is not robbed of a place it earned.
      */}
      <OptionButtons
        options={options}
        chosen={chosen}
        pending={pending}
        disabled={!open}
        onPick={pick}
        outcome={outcome?.result ?? null}
      />

      {/* Between the buttons and the bank, where the thumb already is. It
          appears on the `answer` step and grows a place later — it never
          appears and then contradicts itself. */}
      {verdict && (
        <p className={`speedrun-verdict speedrun-verdict--${verdict.tone}`} role="status">
          <span className="speedrun-verdict__text">{verdict.text}</span>
          {/* Your own time, as soon as there is one. It is the number that
              makes fourth bearable and third worth something. */}
          {verdict.time && <span className="speedrun-verdict__time">{verdict.time}</span>}
        </p>
      )}

      {/* Points, off the frame, counting only the places the television has
          already shown. It lights up on the podium step that names you. */}
      <ScorePanel points={yourScore} scored={(outcome?.points ?? 0) > 0} note={notice} />
    </div>
  );
}
