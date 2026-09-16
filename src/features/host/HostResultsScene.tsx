import { useMemo } from 'react';
import { GameZone } from '../../components/host/GameZone';
import { Dots } from '../../primitives/Dots';
import type { EmojiFeed } from '../../components/EmojiStream';
import type { GameRef, GameRun, PublicPlayer, ScorecardRow } from '../../services/quizwizz';
import { Scorecard } from '../../components/host/Scorecard';
import { byPlace } from '../../components/standings';

/**
 * **`RESULTS` — the game has handed its awards over.**
 *
 * This is what replaced `ROUND_RESULTS` and `SCOREBOARD` together. The reveal
 * belongs to the module and already happened inside `GAME`; the standings are in
 * the left panel and have been all evening. What is left — and what neither of
 * those covered — is the moment the points *land*: who gained what, and for
 * what reason.
 *
 * So the zone shows how this one game went and nothing else. The panel on the
 * left is already doing the standings and repeating them here would be the same
 * list twice on one screen, which is precisely the mistake `SCOREBOARD` was.
 *
 * **It reads `scorecard`, not the ledger.** It used to build the list from
 * `score:update`, and that was wrong twice over: a row worth nothing is never
 * written to an append-only ledger, so everyone who scored nothing vanished from
 * the one screen that was about how the room did — and `score:update` is an
 * event rather than state, so a host tab reloaded during `RESULTS` came back to
 * an empty zone. The scorecard is on the snapshot and carries everybody.
 *
 * Along the bottom: what is coming. That line is the reason the phase exists at
 * all rather than cutting straight into the next game — the room needs a beat to
 * look up, and the host needs somewhere to say "right, next one".
 */
export function HostResultsScene({
  game,
  upNext,
  scorecard,
  players,
  feed,
}: {
  game: GameRun | null;
  upNext: GameRef | null;
  /** Null only before the first phase message lands, or against an older server. */
  scorecard: ScorecardRow[] | null;
  players: PublicPlayer[];
  feed: EmojiFeed | null;
}) {
  const rows = useMemo(() => byPlace(scorecard ?? []), [scorecard]);

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
      {rows.length === 0 ? (
        <p className="subtle">No scores this round.</p>
      ) : (
        <Scorecard rows={rows} players={players} />
      )}
    </GameZone>
  );
}
