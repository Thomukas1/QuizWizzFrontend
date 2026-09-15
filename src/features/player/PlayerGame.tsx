import { Suspense } from 'react';
import { lookupGame } from '../../games/registry';
import { serverNow } from '../../services/quizwizz';
import type { QuizWizzState } from '../../services/quizwizz';

/**
 * **`GAME` — a module owns the phone.**
 *
 * The whole of a game, start to finish: its own title card, its own rules
 * screen, its own play, its own reveal. The engine used to own three of those as
 * phases and hand the module only the middle one; it owns all four now, which is
 * why a format can look like whatever it needs to instead of being bent into the
 * shape of a quiz.
 *
 * This component is deliberately almost nothing — it looks a component up,
 * checks there is something to hand it, and gets out of the way. **No reaction
 * bar**: that lives in `<PlayerIntermission>`, so a thumb about to answer
 * something isn't sharing the screen with eight emoji buttons.
 */
export function PlayerGame({
  view,
  you,
  answer,
  input,
}: {
  view: QuizWizzState['view'];
  you: QuizWizzState['you'];
  answer: (itemId: string, choice: unknown) => void;
  input: (type: string, payload?: unknown) => void;
}) {
  const game = lookupGame(view?.gameId);

  // The gap between `session:phase GAME` and the first `view:player`. It is one
  // round trip, but a blank phone mid-party reads as broken and the first thing
  // anyone does about it is reload — the one action that actually costs them
  // their place.
  if (!view || !you) {
    return (
      <div className="player-game player-game--waiting">
        <p className="subtle">Getting your controls…</p>
      </div>
    );
  }

  // An unknown `gameId` renders a placeholder, never a crash. The server refuses
  // an unregistered game when the playlist is set, so the only way to reach this
  // is mid-development — and taking fifteen phones down for it would be a poor
  // trade.
  if (!game) {
    return (
      <div className="player-game player-game--waiting">
        <p className="subtle">This round isn't built yet.</p>
        <p className="subtle text-sm">Watch the big screen.</p>
      </div>
    );
  }

  const { Player } = game;

  return (
    <div className="player-game">
      <Suspense fallback={<p className="subtle">Loading…</p>}>
        {/*
          The entire world a game can see: its own projection, who this phone
          is, when the current step ends, and two senders. It never reaches for
          the socket or the clock, which is what keeps "add a game" to one
          registry line.

          `deadline` comes off the frame rather than off the phase, so a game
          that times each question separately gets a fresh one per step without
          the engine changing phase underneath it.
        */}
        <Player
          state={view.state as never}
          you={you}
          deadline={view.deadline}
          serverNow={serverNow}
          answer={answer}
          input={input}
        />
      </Suspense>
    </div>
  );
}
