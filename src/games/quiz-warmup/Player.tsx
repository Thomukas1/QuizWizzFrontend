import { Timer } from '../../components/Timer';
import { OptionButtons, ScorePanel, useAnswerLock } from '../quizkit';
import type { PlayerProps } from '../registry';
import type { WarmupPlayerView } from './view';

/**
 * **The warmup, in a hand.** Which question, how long is left, four buttons, and
 * what you have made so far.
 *
 * **No prompt.** That is a design rule rather than a shortcut: the question
 * stays on the television so everyone's eyes stay up and the room stays social,
 * and it means a phone's payload has nothing in it worth opening devtools for.
 * The correct key is never in a player frame in any form, at any step — which is
 * why the reveal here can only decorate your own choice.
 *
 * **And no sentence about how you did.** "Not this time" is the television's
 * job, said once, to everybody, with the answer next to it. On a phone it is a
 * line of text arriving under a thumb at the exact moment the room is looking
 * up at the big screen — so the button colours and the footer carry it instead,
 * and nobody reads a verdict off their own lap.
 *
 * Every state comes off the frame. `yourChoice` **is** the locked state — a
 * first submission wins and there is no way to replace it — so nothing here
 * tracks "have I answered" separately, and a phone that reconnects mid-question
 * repaints its locked-in button from the snapshot alone.
 */
export default function WarmupPlayer({ state, deadline, answer }: PlayerProps<WarmupPlayerView>) {
  const { itemIndex, itemCount, itemId, options, open, yourChoice, outcome, yourScore } = state;

  const { chosen, pending, notice, pick } = useAnswerLock({ itemId, yourChoice, open, answer });

  // No item up. In the warmup this is only the beat before the first frame, but
  // a format with an opening stage sits here for a whole card.
  if (!itemId) {
    return (
      <div className="quiz-player quiz-player--waiting">
        <p className="subtle">Watch the big screen…</p>
      </div>
    );
  }

  return (
    <div className="quiz-player">
      {/* Which question, and how long is left. Centred, and the only two things
          up here: everything else a phone could say during a round is already
          being said three metres away, larger, to the whole room at once. */}
      <header className="quiz-player__head">
        <span className="quiz-player__counter">
          {itemIndex >= 0 ? `Question ${itemIndex + 1} / ${itemCount}` : 'Warmup'}
        </span>
        {/* Null on the reveal and hidden on the `locked` beat — the component
            decides that from the deadline's own kind, not from the step. */}
        <Timer deadline={deadline} size="sm" />
      </header>

      {/*
        `open` is the server's word on whether the buttons are live, and it is
        false through the intro, the lock and the reveal. The deadline passing
        is deliberately *not* part of this: the server accepts up to
        SUBMIT_GRACE_MS past `endsAt` and clamps the recorded time, so a slow
        connection is not robbed and the grace buys nobody anything.
      */}
      <OptionButtons
        options={options}
        chosen={chosen}
        pending={pending}
        disabled={!open}
        onPick={pick}
        outcome={outcome}
      />

      {/* Points, off the frame, counting only what has already been revealed.
          It lights up on the reveal where this phone scored — which is the
          whole of what the phone says about being right. */}
      <ScorePanel points={yourScore} scored={outcome === 'correct'} note={notice} />
    </div>
  );
}
