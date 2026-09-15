import { GameZone } from '../../components/host/GameZone';
import { Dots } from '../../primitives/Dots';
import type { EmojiFeed } from '../../components/EmojiStream';
import type { GameRef, GameRun, PublicLedgerEntry, PublicPlayer } from '../../services/quizwizz';
import { Avatar } from '../../components/Avatar';

/**
 * **`RESULTS` — the game has handed its awards over.**
 *
 * This is what replaced `ROUND_RESULTS` and `SCOREBOARD` together. The reveal
 * belongs to the module and already happened inside `GAME`; the standings are in
 * the left panel and have been all evening. What is left — and what neither of
 * those covered — is the moment the points *land*: who gained what, and for
 * what reason.
 *
 * So the zone shows the ledger for this game and nothing else. The panel on the
 * left is already doing the standings and repeating them here would be the same
 * list twice on one screen, which is precisely the mistake `SCOREBOARD` was.
 *
 * Along the bottom: what is coming. That line is the reason the phase exists at
 * all rather than cutting straight into the next game — the room needs a beat to
 * look up, and the host needs somewhere to say "right, next one".
 */
export function HostResultsScene({
  game,
  upNext,
  entries,
  players,
  feed,
}: {
  game: GameRun | null;
  upNext: GameRef | null;
  entries: PublicLedgerEntry[];
  players: PublicPlayer[];
  feed: EmojiFeed | null;
}) {
  const byId = new Map(players.map(p => [p.id, p]));

  // Biggest gain first — the flyups read top-down and the winner of the game
  // should be the first name the room's eye lands on. Zero-delta rows are kept:
  // "you scored nothing this round" is information, and dropping those names
  // makes the list look like half the room stopped playing.
  const awards = [...entries].sort((a, b) => b.delta - a.delta);

  return (
    <GameZone
      feed={feed}
      top={<h2 className="game-zone__title">{game ? game.title : 'Scores'}</h2>}
      bottom={
        <p className="game-zone__footnote">
          {upNext ? (
            <>Next up — {upNext.title}</>
          ) : (
            <>
              Final standings<Dots />
            </>
          )}
        </p>
      }
    >
      {awards.length === 0 ? (
        <p className="subtle">No points this round.</p>
      ) : (
        <ol className="awards">
          {awards.map(entry => {
            const player = byId.get(entry.playerId);
            if (!player) return null;
            return (
              <li key={entry.id} className="awards__row">
                <Avatar avatar={player.avatar} size={48} seed={player.id} />
                <span className="awards__name">{player.name}</span>
                {/* The module wrote this — "1st fastest", "survived". It is the
                    only explanation the room gets for a number, so it is not
                    optional decoration. */}
                <span className="awards__reason">{entry.reason}</span>
                <span
                  className={`awards__delta${entry.delta > 0 ? ' awards__delta--gain' : ''}`}
                >
                  {entry.delta > 0 ? `+${entry.delta}` : entry.delta || '—'}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </GameZone>
  );
}
