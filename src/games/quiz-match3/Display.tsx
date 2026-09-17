import { Timer } from '../../components/Timer';
import { useCountdown } from '../../hooks/quizwizz';
import type { Deadline } from '../../services/quizwizz';
import type { DisplayProps } from '../registry';
import { BankBurst } from './BankBurst';
import type { Match3DisplayView } from './view';

/**
 * **Match-3, on the television.** Twenty items, eight seconds each, and nothing
 * between them.
 *
 * The other two formats hand the room a beat between questions — an intro, a
 * lock, a reveal — and their displays are built around it. This one has none, by
 * design: the clock paces it and the host is not driving. So the screen during
 * the barrage holds still and says as little as possible, because the only thing
 * that changes every eight seconds is the thing in the middle.
 *
 * ## `if (!item)` is the trap
 *
 * Both the other displays open with it, and both are right to: every step they
 * have is an item step. Here **two of the four steps have no item and both are
 * real screens** — the card that opens the round and the card that closes it.
 * Branching on `item` would render "warming up…" over the opening and the
 * result.
 *
 * So this branches on `step` first, and every branch is a whole screen:
 *
 * | | |
 * |---|---|
 * | `topic` | The rule of the format, then the topic. Host-paced. |
 * | `countdown` | 3 · 2 · 1 off the `prepare` deadline. |
 * | `open` | The question, the clock, and the two answers across the full width. |
 * | `summary` | A two-and-a-half second hold, then the game settles itself. |
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
 * **There is no `<OptionGrid correct={...}>` here either.** Nothing on a display
 * frame in this format ever names the correct answer, at any step, because there
 * is no reveal to name it on.
 *
 * It renders inside `<GameZone>`, so it supplies content and never layout — with
 * one deliberate exception: `<BankBurst>` portals out of the zone entirely, for
 * the reason its own note gives.
 */

/**
 * **3 · 2 · 1.** Its own component so that only it re-renders on the tick.
 *
 * `useCountdown` runs at 10Hz, and a display that subscribes to it re-renders
 * the whole screen ten times a second for the length of an item. The clock the
 * room watches during `open` is `<Timer>`, which owns its own countdown for
 * exactly this reason; this is the same move for the one step that wants the
 * digit on its own.
 */
function CountdownDigit({ deadline }: { deadline: Deadline | null }) {
  const { ms } = useCountdown(deadline);

  // Ceiling, like `<Timer>`: 200ms left still reads 1. A zero on a starting gun
  // is a frame nobody needs to see.
  const digit = Math.max(1, Math.ceil(ms / 1000));

  // Keyed on the digit, so each second is a new element and the pop runs once
  // per number instead of once per countdown.
  return <p key={digit} className="match3-countdown">{digit}</p>;
}

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
  } = state;

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
      <div className="quiz-display quiz-display--match3-card">
        {burst}

        {/* **The rule, and then what the rule is about.** Both numbers in it are
            off the frame, and it is the only screen all round with the room's
            attention and no clock running — so it is the only place the format
            gets explained. */}
        <p className="match3-rule">
          {streakLength} correct answers in a row banks you {pointsPerStreak}{' '}
          {pointsPerStreak === 1 ? 'point' : 'points'}. If you miss, you lose the streak.
        </p>

        <p className="match3-billing">
          <span className="match3-billing__label">Topic</span>
          <span className="match3-topic">{topic}</span>
        </p>
      </div>
    );
  }

  if (step === 'countdown') {
    return (
      <div className="quiz-display quiz-display--match3-card">
        {burst}
        <span className="match3-billing__label">{topic}</span>
        <CountdownDigit deadline={deadline} />
      </div>
    );
  }

  if (step === 'summary') {
    return (
      <div className="quiz-display quiz-display--match3-card">
        {burst}
        <span className="match3-billing__label">{topic}</span>
        <p className="match3-over">That's the round</p>
      </div>
    );
  }

  // `open` with no item: the one frame that should never arrive, and a blank
  // television mid-party reads as broken to the whole room.
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

        {/* `live`, then `lastChance` when the room is in early. The component
            reads that off the deadline's own kind. */}
        <Timer deadline={deadline} size="lg" />
      </header>

      <div className="match3-arena">
        <p className="match3-item">{item.prompt}</p>

        {/*
          **The round's options, not the item's.** They are the same two on
          every item by the format's contract with its content, which is what
          lets them be painted once and never repaint — the pair belongs to the
          topic rather than to the song. Across the full width in one line, in
          the same order and with the same letters as the phone.
        */}
        <ul className="match3-options">
          {options.map(option => (
            <li key={option.key} className="match3-option">
              <span className="match3-option__key">{option.key}</span>
              <span className="match3-option__label">{option.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
