import { Timer } from '../../components/Timer';
import { Countdown, GameRules } from '../quizkit';
import type { DisplayProps } from '../registry';
import { BankBurst } from './BankBurst';
import type { Match3DisplayView } from './view';

/**
 * **Match-3, on the television.** Twenty items, ten seconds to answer and five
 * with the answer up.
 *
 * The other two formats hand the room a beat between questions — an intro, a
 * lock, a multi-step reveal — and their displays are built around walking it.
 * This one has a single screen instead: `hold`, which is the answer and
 * everything that answer just did, up for five seconds and then gone. So the
 * barrage still holds still and says as little as possible while a question is
 * live, because the only thing that changes in those ten seconds is the thing in
 * the middle — and then it says all of it at once.
 *
 * ## `if (!item)` is the trap
 *
 * Both the other displays open with it, and both are right to: every step they
 * have is an item step. Here **two of the five steps have no item and both are
 * real screens** — the card that opens the round and the card that closes it.
 * Branching on `item` would render "warming up…" over the opening and the
 * result.
 *
 * So this branches on `step` first, and every branch is a whole screen:
 *
 * | | |
 * |---|---|
 * | `topic` | The kit's `<GameRules>` — the rule of the format, then the topic. Host-paced. |
 * | `countdown` | The kit's `<Countdown>`, off the `prepare` deadline. |
 * | `open` | The question, the clock, and the two answers across the full width. |
 * | `hold` | **That same screen**, with the answer marked on it. |
 * | `summary` | A two-and-a-half second hold, then the game settles itself. |
 *
 * ## `hold` is not a branch, and that is the point
 *
 * It is the `open` screen with two class names different, because the item has
 * to stay exactly where it was: the answer is *about* the thing, so the thing
 * cannot move or leave at the moment the answer arrives. A fifth branch would be
 * this arena pasted twice and would drift the first time either copy was
 * touched. So the step buys one local — `revealed` — and the same markup renders
 * either way.
 *
 * **The first two are the kit's components now.** This format had them first and
 * they were its own; the shape — a held card naming the round and explaining it,
 * then three seconds of starting gun — turned out to belong to every format that
 * opens by explaining itself. What is still Match-3's is the sentence, which is
 * built from two numbers off the frame, and the topic that goes under it.
 *
 * The step is still called `topic` rather than the kit's `rules`, because the id
 * is the server's and this side does not get to rename one.
 *
 * ## There is no scoreboard here
 *
 * The format used to end on its own ranked card — everybody, sorted by banks,
 * with their best runs. It is gone, and so is the streak grid that used to run
 * along the bottom of the barrage, for two different reasons that landed in the
 * same place.
 *
 * The grid did not survive the pace: items move too quickly to read somebody
 * else's pips between them, nobody was trying to, and a room of forty turned the
 * band into a wall of 30px faces — a hundred would not have fitted on a
 * television at all. **`<BankBurst>` is the same information at the only moment
 * it is worth having**, and it draws the few who just scored rather than the
 * many who didn't, so it costs the same screen space at any roster size.
 *
 * The card was a different mistake: it ranked the room by banks one beat before
 * `RESULTS` ranks the same room by points. Two tables, same people, different
 * units, and the second is the one the evening is actually played in. So the
 * closing step is a **hold** now rather than a screen — the server times it at
 * `summaryMs`, and all it is for is the last item's `+1` getting off the top of
 * the television before the scorecard takes it.
 *
 * **The answer is marked on this format's own options, not the kit's
 * `<OptionGrid>`.** The kit's is a stack of rows and these are two panels across
 * the full width, which is what two fixed options the room has been staring at
 * all round should look like. What is borrowed is the vocabulary rather than the
 * component: `--correct` on the winner and `--dim` on the other, the same pair of
 * modifiers under the same names the grid uses, so the room is not asked to learn
 * a second way of being shown a right answer halfway through the evening.
 *
 * `state.hold` is null on every step but its own — the server does not put an
 * answer on a frame the buttons are live for — so the marking is a fact of the
 * frame rather than a secret this component is trusted to keep.
 *
 * It renders inside `<GameZone>`, so it supplies content and never layout — with
 * one deliberate exception: `<BankBurst>` portals out of the zone entirely, for
 * the reason its own note gives.
 */

export default function Match3Display({ state, players, deadline }: DisplayProps<Match3DisplayView>) {
  const {
    step,
    topic,
    options,
    item,
    itemIndex,
    itemCount,
    banked,
    settledIndex,
    streakLength,
    pointsPerStreak,
    hold,
  } = state;

  /**
   * **The answer, or nothing** — and the only thing that tells the two item
   * steps apart.
   *
   * Gated on the step as well as on the field, which is belt and braces on
   * purpose: `hold` is already null everywhere else, and a display that also
   * refuses to paint one outside its step cannot be made to leak by a server
   * that starts sending it early.
   */
  const revealed = step === 'hold' ? hold : null;

  /**
   * Mounted on every step, and the reason it is up here rather than inside the
   * `open` branch: an item can close on the last frame of the barrage, and the
   * burst it fires has two seconds left to run while the screen has already
   * become the summary. Unmounting it with the branch would cut that off
   * mid-flight.
   */
  const burst = (
    <BankBurst banked={banked} settledIndex={settledIndex} points={pointsPerStreak} players={players} />
  );

  if (step === 'topic') {
    return (
      <>
        {/* Outside the card rather than inside it, now that the card is the
            kit's. It makes no difference to what is drawn — the layer portals
            itself to `<body>` and renders nothing where it sits — and what
            matters about it is that it stays mounted, which it does. */}
        {burst}

        {/* **The rule, and then what the rule is about.** Both numbers in the
            sentence are off the frame, and this is the only screen all round
            with the room's attention and no clock running — so it is the only
            place the format gets explained. */}
        <GameRules title="Match-3" subject={{ label: 'Topic', value: topic }}>
          <p>
            {streakLength} correct answers in a row banks you {pointsPerStreak}{' '}
            {pointsPerStreak === 1 ? 'point' : 'points'}. If you miss, you lose the streak.
          </p>
        </GameRules>
      </>
    );
  }

  if (step === 'countdown') {
    return (
      <>
        {burst}
        {/* The topic stays up over the digit: it is what twenty items are all
            instances of, and blinking it out for three seconds and back would
            be the one thing on this screen that moved. */}
        <Countdown deadline={deadline} label={topic} />
      </>
    );
  }

  if (step === 'summary') {
    return (
      <div className="quiz-display quiz-card">
        {burst}
        <span className="quiz-card__label">{topic}</span>
        <p className="match3-over">That's the round</p>
      </div>
    );
  }

  // An item step with no item: the one frame that should never arrive, and a
  // blank television mid-party reads as broken to the whole room.
  if (!item) {
    return (
      <div className="quiz-display quiz-display--empty">
        {burst}
        <p className="subtle">Here we go…</p>
      </div>
    );
  }

  return (
    <div className="quiz-display quiz-display--match3">
      {burst}

      <header className="quiz-display__head">
        {/* The topic stays up for the whole barrage. It is the question every
            item is an instance of, and twenty items is long enough that
            somebody looking up halfway through needs it. */}
        <div className="match3-head">
          <span className="match3-head__topic">{topic}</span>
          <span className="match3-head__counter">
            {itemIndex + 1} <span className="match3-head__of">/ {itemCount}</span>
          </span>
        </div>

        {/* `live`, then `lastChance` when the room is in early, then `prepare`
            for the five seconds of the hold. The component reads all of that
            off the deadline's own kind — this never names a step to the clock. */}
        <Timer deadline={deadline} size="lg" />
      </header>

      {/* The prompt does not move between the two steps. Whatever is being
          judged is what the answer is about, so it stays put and the options
          underneath it are what changes. */}
      <div className="match3-arena">
        <p className="match3-item">{item.prompt}</p>

        {/*
          **The round's options, not the item's.** They are the same two on
          every item by the format's contract with its content, which is what
          lets them be painted once and never repaint — the pair belongs to the
          topic rather than to the song. Across the full width in one line, in
          the same order and with the same letters as the phone.

          On the hold one of them goes green and the other dims. Dimming rather
          than hiding: "it was the left one" reads across a room faster than a
          label on its own does, and the pair keeps the shape the room has been
          reading all round.
        */}
        <ul className="match3-options">
          {options.map(option => (
            <li
              key={option.key}
              className={
                'match3-option' +
                (revealed
                  ? revealed.correct === option.key
                    ? ' match3-option--correct'
                    : ' match3-option--dim'
                  : '')
              }
            >
              <span className="match3-option__key">{option.key}</span>
              <span className="match3-option__label">{option.label}</span>
            </li>
          ))}
        </ul>

        {/* Under the one that just went green, and only when the item has a
            sentence — a missing explanation is not a blank line. Most items do
            not have one, and the hold works with nothing but the green.

            The kit's class, not one of this format's: an explanation looks the
            same wherever it is read out, and warmup got there first. */}
        {revealed?.explain && <p className="quiz-display__explain">{revealed.explain}</p>}
      </div>
    </div>
  );
}
