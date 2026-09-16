import { Timer } from '../../components/Timer';
import { LockedInCount, MediaStrip, OptionGrid } from '../quizkit';
import type { DisplayProps } from '../registry';
import { CrowdCircle } from './CrowdCircle';
import type { SpeedrunDisplayView } from './view';

/**
 * **Speedrun, on the television.** The warmup's screen until the answer lands,
 * and then something else entirely.
 *
 * The question half is deliberately identical to `quiz-warmup` — same prompt at
 * the top, same lettered options, same locked-in count. That is the joke the
 * format runs on: an interface the room has already learned, and a completely
 * different feeling behind it, because being right stopped being enough.
 *
 * ## Two screens, one step apart
 *
 * `reveal.crowd` is the switch, and it is the switch because the server wrote it
 * that way: null through `answer`, a list from `crowd` on. So
 *
 * - **`intro` / `open` / `locked` / `answer`** — the question, and on `answer`
 *   the correct option turning green with its explanation under it.
 * - **`crowd` / every `podium` step** — the question is gone and the ring owns
 *   the screen.
 *
 * Nothing here switches on `step`. Six step ids and two layouts is four chances
 * to get a branch wrong; the frame says which one it is, in the one field whose
 * whole purpose is to say so.
 *
 * **The answer stays on screen as a strip** once the ring takes over. A room
 * watching people explode for ten seconds forgets what the question was, and the
 * host ends up reading it back out.
 *
 * It renders inside `<GameZone>`, so it supplies content and never layout.
 */
export default function SpeedrunDisplay({ state, players, deadline }: DisplayProps<SpeedrunDisplayView>) {
  const { item, itemIndex, itemCount, answered, expected, reveal, step } = state;

  const counter = itemIndex >= 0 ? `${itemIndex + 1} / ${itemCount}` : null;

  if (!item) {
    return (
      <div className="quiz-display quiz-display--empty">
        <p className="subtle">On your marks…</p>
      </div>
    );
  }

  // The reveal's second half. `crowd` is null through `answer` and a list from
  // the `crowd` step on, which makes this the frame's own word on which of the
  // two screens is up rather than a step table kept in sync by hand.
  const ring = reveal && reveal.crowd !== null;
  const correctOption = reveal ? item.options.find(option => option.key === reveal.correct) : undefined;

  if (ring) {
    return (
      <div className="quiz-display quiz-display--ring">
        {/* Small, and still there. Ten seconds of explosions is long enough for
            a room to lose track of what was being asked, and the host should
            not have to read it back out. */}
        <header className="speedrun-recap">
          {counter && <span className="speedrun-recap__counter">{counter}</span>}
          <span className="speedrun-recap__prompt">{item.prompt}</span>
          {correctOption && (
            <span className="speedrun-recap__answer">
              <span className="speedrun-recap__key">{correctOption.key}</span>
              {correctOption.label}
            </span>
          )}
        </header>

        <CrowdCircle
          players={players}
          crowd={reveal.crowd ?? []}
          winners={reveal.winners}
          podium={reveal.podium}
          place={reveal.place}
        />
      </div>
    );
  }

  return (
    <div className="quiz-display">
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

        {/* Null on the reveal and hidden on the `locked` beat — the component
            decides that from the deadline's own kind, not from the step. */}
        <Timer deadline={deadline} size="lg" />
      </header>

      <div className="quiz-display__main">
        <MediaStrip media={item.media} />
        {/* `reveal` is null until the `answer` step, so the green is a fact of
            the frame rather than something this component has to be trusted to
            withhold. */}
        <OptionGrid options={item.options} correct={reveal?.correct ?? null} />

        {reveal?.explain && <p className="quiz-display__explain">{reveal.explain}</p>}
      </div>

      <footer className="quiz-display__foot">
        {(step === 'open' || step === 'locked') && (
          <LockedInCount answered={answered.length} expected={expected} size="lg" />
        )}

        {/* On `answer`, and only there: the room has the correct option and not
            one word about who got it. That gap is the crowd step's whole job,
            and filling it here would spend the format's best beat early. */}
        {reveal && (
          <p className="speedrun-hold">
            {reveal.winners === 1
              ? 'One place pays. Who was fastest?'
              : `Only the ${reveal.winners} fastest score…`}
          </p>
        )}
      </footer>
    </div>
  );
}
