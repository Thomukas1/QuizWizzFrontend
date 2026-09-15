import { GameZone } from '../../components/host/GameZone';
import { Dots } from '../../primitives/Dots';
import type { EmojiFeed } from '../../components/EmojiStream';

/**
 * **LOBBY, in the game zone.** A title, a promise, and a held breath.
 *
 * Nothing actionable: the QR code lives in the admin panel now, where it stays
 * reachable for the whole evening rather than only while this screen is up —
 * somebody's phone always drops, and the way back in shouldn't disappear the
 * moment the first round starts.
 *
 * "Waiting for players" shows regardless of how many have joined. Who is in is
 * the leaderboard's job and it is right there on the left; repeating a count
 * here would be the same number twice on one screen. The room is waiting until
 * the host decides it isn't, and that decision is a keypress, not a threshold.
 */
export function HostLobbyScene({ feed }: { feed: EmojiFeed | null }) {
  return (
    <GameZone
      feed={feed}
      top={<h2 className="game-zone__title">QUIZWIZZ</h2>}
      bottom={
        <p className="game-zone__footnote">
          Waiting for players<Dots />
        </p>
      }
    >
      <p className="game-zone__tagline">
        Prove yourself and become the champion of brainrot
      </p>
    </GameZone>
  );
}
