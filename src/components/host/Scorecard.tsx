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
 *
 * ## A tie says how wide it is
 *
 * Four people on the same score used to be four rows all reading `3rd`, and the
 * room read that as four separate third places — the obvious question being what
 * happened to 4th, 5th and 6th. They are *in* the tie: the server shares the
 * place across it and pushes the next player past all of them, so those rows are
 * jointly 3rd through 6th and the next one down is 7th.
 *
 * So a shared place is drawn as the span it occupies, `3-6th`. That is read off
 * the server's own numbering rather than worked out — the group's size is how
 * far the pushed-past row was pushed — and it is the same fact the table always
 * carried, printed instead of implied.
 */

/** Decoration, not protocol — the wire carries the number, so this lives here. */
function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/**
 * Past this many rows the rows go compact — smaller faces, tighter padding, so
 * more of the table is above the fold before it has to be scrolled.
 *
 * It used to switch to two columns instead, which is the thing that made a
 * scorecard of twelve read as two unrelated tables and put 7th place at the top
 * of the screen beside 1st. One column is one ranking.
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

  /**
   * How many rows share each place. A place held by one player is the ordinary
   * case and prints as it always did; anything above one is a tie, and its size
   * is exactly how many places it swallowed.
   */
  const sharing = new Map<number, number>();
  for (const row of rows) sharing.set(row.place, (sharing.get(row.place) ?? 0) + 1);

  return (
    <ol className={`scorecard${dense ? ' scorecard--dense' : ''}`}>
      {rows.map(row => {
        const player = byId.get(row.playerId);
        const paid = row.delta !== 0;

        // `3-6th` when four people scored the same, `3rd` when one did. The
        // upper bound is the last place the tie occupies, which is the place it
        // starts at plus everyone else in it.
        const shared = sharing.get(row.place) ?? 1;
        const place =
          shared > 1 ? `${row.place}-${ordinal(row.place + shared - 1)}` : ordinal(row.place);

        return (
          <li
            key={row.playerId}
            className={`scorecard__row${paid ? '' : ' scorecard__row--blank'}`}
          >
            <span className="scorecard__place">{place}</span>

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
