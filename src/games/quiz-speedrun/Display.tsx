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
 * **The ring takes the screen alone** — no recap strip, no question above it.
 * The room has just watched the option turn green and it is the host's job to
 * carry a question the room is looking away from anyway; a line of text over
 * fifteen exploding faces was two things asking to be read at once, and the
 * faces are the ones that have to be legible from three metres.
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

  if (ring) {
    return (
      <div className="quiz-display quiz-display--ring">
        <CrowdCircle
          players={players}
          crowd={reveal.crowd ?? []}
          winners={reveal.winners}
          podium={reveal.podium}
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
      </footer>
    </div>
  );
}
