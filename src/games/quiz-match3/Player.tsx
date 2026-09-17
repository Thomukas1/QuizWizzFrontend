import { useEffect, useState } from 'react';
import { Timer } from '../../components/Timer';
import { OptionButtons, ScorePanel, useAnswerLock } from '../quizkit';
import type { QuizOutcome } from '../quizkit';
import type { PlayerProps } from '../registry';
import { StreakBattery } from './StreakBattery';
import type { Match3PlayerView } from './view';

/**
 * **Match-3, in a hand.** Two buttons, twenty times, and a pack that fills.
 *
 * The buttons are the kit's and the lock is the kit's — `useAnswerLock` needs
 * nothing done to it for the faster pace, because everything it holds is already
 * scoped by `itemId`: an item change clears a pending tap and a notice, and an
 * ack that arrives for the item before this one is ignored by the same guard
 * that has always ignored it. Rebuilding it for eight seconds would be
 * rebuilding it for the case it was written for.
 *
 * Two things here are this format's own.
 *
 * ## The flash
 *
 * `state.outcome` lands the instant a tap is acked. It is the one place in the
 * app where a phone learns the answer before the room does, and it is safe for
 * exactly one reason: it is only ever set for somebody who has already
 * submitted, and **a submission is final**. There is nothing here to act on.
 *
 * It is a wash of colour over the whole strip and nothing else — no word, no
 * icon, no delay. Two hundred milliseconds, keyed on `itemIndex` so it resets
 * per item. Anything slower and the next item feels like an ambush, which at
 * eight seconds is not a figure of speech.
 *
 * ## The pack
 *
 * `streak`, `banks` and `bestRun` are folded **one item further than the
 * television's** — theirs move when an item closes, these move on the tap. The
 * pack filling *is* the reward for answering, so withholding it until the room
 * finds out would leave the phone flashing green at nothing. Up to eight seconds
 * of disagreement with the grid on the wall is the design, not a bug to
 * reconcile; they agree again the moment the item closes.
 *
 * `yourScore` arrives already multiplied, like every other format's. Nothing
 * here counts anything.
 */

/** Long enough to register as colour, short enough not to eat the next item. */
const FLASH_MS = 200;

/**
 * **Their own result, for a fifth of a second.**
 *
 * `outcome` stays set for the rest of the item once they have answered — it is
 * the frame's honest state, not an event — so the effect is what turns it into
 * one. Both dependencies are values rather than objects, which is what stops the
 * dozen frames pushed during an item from re-firing it: neither changes until
 * the item does.
 */
function useOutcomeFlash(outcome: QuizOutcome | null, itemIndex: number): QuizOutcome | null {
  const [lit, setLit] = useState<{ index: number; outcome: QuizOutcome } | null>(null);

  useEffect(() => {
    if (!outcome) return;
    setLit({ index: itemIndex, outcome });
    const id = setTimeout(() => setLit(null), FLASH_MS);
    return () => clearTimeout(id);
  }, [outcome, itemIndex]);

  // Scoped to the item it was lit for, so a flash cannot survive into the next
  // one even if its timer is beaten by a frame.
  return lit && lit.index === itemIndex ? lit.outcome : null;
}

export default function Match3Player({ state, deadline, answer }: PlayerProps<Match3PlayerView>) {
  const {
    step,
    itemIndex,
    itemCount,
    itemId,
    options,
    open,
    yourChoice,
    outcome,
    streak,
    bestRun,
    streakLength,
    last,
    yourScore,
  } = state;

  const { chosen, pending, notice, pick } = useAnswerLock({ itemId, yourChoice, open, answer });
  const flash = useOutcomeFlash(outcome, itemIndex);

  /**
   * **Answered.** `last` belongs to the item on screen once they are in and to
   * the previous one until they are, so this is what says whether the pack's
   * animation is theirs to play yet.
   */
  const settled = outcome !== null;

  return (
    <div className="quiz-player match3-player">
      {/*
        Keyed on the item, so the element is new every time and the animation
        runs once. It sits over the whole strip and takes no pointer events —
        a wash that swallowed a tap would cost somebody the next item.
      */}
      {flash && (
        <span key={itemIndex} className={`match3-flash match3-flash--${flash}`} aria-hidden="true" />
      )}

      <header className="quiz-player__head">
        <span className="quiz-player__counter">
          {/* No item on the topic card or the summary, and both are real screens
              here — the counter says what is happening instead of counting. */}
          {itemId ? `${itemIndex + 1} / ${itemCount}` : step === 'summary' ? 'Round over' : 'Match-3'}
        </span>
        {/* `prepare` on the countdown, `live` then `lastChance` on an item, and
            nothing at all on the two host-paced steps. */}
        <Timer deadline={deadline} size="sm" />
      </header>

      {/*
        `open` is the server's word on whether the buttons are live: false on the
        topic card, through the countdown and on the summary. The labels are the
        round's rather than the item's, so they are painted before the first item
        exists and never repaint — which is what makes eight seconds enough to
        answer in.
      */}
      <OptionButtons
        options={options}
        chosen={chosen}
        pending={pending}
        disabled={!open}
        onPick={pick}
      />

      {/* The round is over and there is one thing left worth saying, which is
          the number `banks` alone cannot tell you: whether that was six straight
          or two lucky threes. */}
      {step === 'summary' && (
        <p className="match3-best">
          Best run <span className="match3-best__figure">{bestRun}</span>
        </p>
      )}

      {/*
        **Directly above the bank, at the bottom of the strip**, because the two
        of them are one story told in two tenses: the pack is the point being
        earned and the panel is the points already kept. Under the thumb rather
        than above the buttons, where it was competing with the question for the
        top of the screen and was the first thing to be pushed off a short phone.

        Remounted on the item they answered, which is what makes `bank` and
        `burn` play exactly once. Before they answer, the key is the same string
        for every frame, so the pack sits still while `last` still describes the
        item before it.
      */}
      <StreakBattery
        key={settled ? `item-${itemIndex}` : 'waiting'}
        streak={streak}
        streakLength={streakLength}
        last={last}
        beat={settled}
      />

      {/* Points off the frame, and lit on the item that banked one. `settled`
          gates it for the same reason the pack's animation is gated: until they
          answer, `last` is about the item before. */}
      <ScorePanel points={yourScore} scored={settled && last === 'bank'} note={notice} />
    </div>
  );
}
