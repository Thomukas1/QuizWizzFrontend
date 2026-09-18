import { Suspense } from 'react';
import { GameZone } from '../../components/host/GameZone';
import { lookupGame } from '../../games/registry';
import { serverNow } from '../../services/quizwizz';
import type { EmojiFeed } from '../../components/EmojiStream';
import type { PublicPlayer, QuizWizzState } from '../../services/quizwizz';

/**
 * **`GAME` — a module owns the television.**
 *
 * Its title card, its rules screen, its play, its reveal. The engine used to own
 * the first, third and fourth of those as separate phases and hand the module
 * only the second; it owns all of them now, which is the point of the redesign —
 * a drawing game and a buzzer race want different openings, and one `rules`
 * string was never going to give them one.
 *
 * It still renders inside `<GameZone>`, so a module supplies content and never
 * layout, and inherits the emoji field and the three-row frame for free.
 */
export function HostGameScene({
  view,
  players,
  feed,
}: {
  view: QuizWizzState['view'];
  players: PublicPlayer[];
  feed: EmojiFeed | null;
}) {
  const game = lookupGame(view?.gameId);

  // The gap between `session:phase GAME` and the first `view:display`. One round
  // trip — but a blank zone mid-party reads as broken to fifteen people at once.
  if (!view) {
    return (
      <GameZone feed={feed}>
        <p className="subtle">Setting up…</p>
      </GameZone>
    );
  }

  // An unknown `gameId` renders a placeholder, never a crash. The server refuses
  // an unregistered game when the playlist is set, so this is only reachable
  // mid-development — and taking the room's television down for it is a poor
  // trade.
  if (!game) {
    return (
      <GameZone feed={feed} top={<h2 className="game-zone__title">Coming soon</h2>}>
        <p className="subtle">No display built for “{view.gameId}” yet.</p>
      </GameZone>
    );
  }

  const { Display, Backdrop } = game;

  return (
    <GameZone
      feed={feed}
      /* The round's own sky, for the whole of `GAME` — the rules card and the
         countdown included, so the format has already changed the room's
         background by the time it says its name. A game without one plays over
         the app's diagonal stripes, which is what the lobby, the results and the
         podium keep. Its own Suspense boundary: a backdrop still loading must
         not hold up the question. */
      backdrop={
        Backdrop && (
          <Suspense fallback={null}>
            <Backdrop />
          </Suspense>
        )
      }
    >
      <Suspense fallback={<p className="subtle">Loading…</p>}>
        {/*
          The entire world a game can see. `deadline` comes off the frame rather
          than off the phase, so a format that times each question separately
          gets a fresh one per step without the engine changing phase underneath
          it — which is exactly what a single GAME phase made necessary.
        */}
        <Display
          state={view.state as never}
          players={players}
          deadline={view.deadline}
          serverNow={serverNow}
        />
      </Suspense>
    </GameZone>
  );
}
