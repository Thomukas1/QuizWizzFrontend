import { Avatar } from '../Avatar';
import type { PublicPlayer, ScorecardRow } from '../../services/quizwizz';

/**
 * **How the game that just ended went — the whole room, one row each.**
 *
 * This is what replaced the ledger list on the `RESULTS` screen, and the
 * difference is a row that used to be missing rather than a restyle: the ledger
 * holds *payouts*, so a row worth nothing was never written, so a results screen
 * built from it could only show the people who scored. Half the room's names
 * vanished for the one beat that was about how the room did. The scorecard
 * carries everybody — zero rows included — in one shape, for every format.
 *
 * **Host only, and that is a rule rather than a default.** It lives in
 * `components/host/` because a phone never shows it: between games a phone shows
 * the standings and its own place in them, which is the one thing a television
 * across the room cannot do well. Fifteen rows of a table that is already on the
 * big screen is a strip of phone spent repeating it.
 *
 * **Four columns, and no prose.** Place, face, name, what it paid. `metric`,
 * `unit` and `reason` all ride on the wire and none of them are drawn: "7
 * correct" is the *arithmetic* behind a number the room can already see, and on
 * a television between games the only two questions are where did I come and
 * what did I get.
 *
 * Ordering is `byPlace` in `standings.ts`. Placing is the server's, and it is a
 * different number from `PublicPlayer.rank`: **ties share a place here and push
 * the next player past** — two 2nds and no 3rd — because this is a table of what
 * happened rather than a podium that has to seat exactly three people. Nothing
 * here renumbers it.
 */

/** Decoration, not protocol — the wire carries the number, so this lives here. */
function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/**
 * Past this many rows the table runs two columns instead of scrolling. A table
 * the room takes in at a glance beats a list that reads itself past the name
 * somebody is looking for, and nobody is waiting long enough to scroll.
 */
const DENSE_AT = 8;

interface ScorecardProps {
  /** Already ordered — `byPlace(state.scorecard)`. Rendered in the order given. */
  rows: ScorecardRow[];
  /** The roster, to put a name and a face to an id. */
  players: PublicPlayer[];
}

export function Scorecard({ rows, players }: ScorecardProps) {
  const byId = new Map(players.map(player => [player.id, player]));
  const dense = rows.length > DENSE_AT;

  return (
    <ol className={`scorecard${dense ? ' scorecard--dense' : ''}`}>
      {rows.map(row => {
        const player = byId.get(row.playerId);
        const paid = row.delta !== 0;

        return (
          <li
            key={row.playerId}
            className={`scorecard__row${paid ? '' : ' scorecard__row--blank'}`}
          >
            <span className="scorecard__place">{ordinal(row.place)}</span>

            {player ? (
              <Avatar
                avatar={player.avatar}
                size={dense ? 36 : 48}
                seed={player.id}
                offline={!player.connected}
              />
            ) : (
              /* Somebody who quit between the last question and the settlement.
                 They played, so the row keeps its place and only the face is
                 gone — a table of what happened with a hole in it disagrees
                 with the game everyone just watched. */
              <span className="scorecard__ghost" aria-hidden="true" />
            )}

            <span className="scorecard__name">{player?.name ?? 'Gone'}</span>

            {/* Nothing pays negative today, but the ledger and every total
                already accept one, so it gets its own sign and its own colour
                rather than turning up one evening as a bare minus in the colour
                that means you gained something. */}
            <span
              className={
                'scorecard__delta' +
                (row.delta > 0 ? ' scorecard__delta--gain' : '') +
                (row.delta < 0 ? ' scorecard__delta--loss' : '')
              }
            >
              {row.delta > 0 ? `+${row.delta}` : row.delta === 0 ? '—' : row.delta}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
