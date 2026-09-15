import type { PublicPlayer } from '../services/quizwizz';

/**
 * Turning a roster into standings.
 *
 * Its own file rather than sitting beside `<Leaderboard>`: the podium and both
 * final screens need it, and a module that exports a component *and* a function
 * loses fast refresh for everything in it.
 */

export interface RankedPlayer {
  rank: number;
  player: PublicPlayer;
}

/**
 * **This orders; it never computes.** Every `score` here was folded from the
 * server's ledger and arrived in `roster:update` — a client that adds up its own
 * points is a client that can be edited into first place, and this one runs on
 * the guests' phones.
 *
 * `roster:update` arrives in join order and `sort` is stable, so equal scores
 * keep the order they joined in — which is exactly the tie rule the server's own
 * `standings()` uses. Matching it by construction is why there is no tie-break
 * here to disagree with it later.
 *
 * Ranks are sequential rather than shared (no two 3rds, no missing 4th). A
 * podium holds exactly three people, and "who is on the box" should not be a
 * question the screen leaves open at the loudest moment of the evening.
 */
export function rankPlayers(players: PublicPlayer[]): RankedPlayer[] {
  return [...players]
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({ rank: index + 1, player }));
}
