import type { PublicPlayer, ScorecardRow } from '../services/quizwizz';

/**
 * Reading standings off the roster.
 *
 * **This orders; it never ranks.** `rank` and `previousRank` arrive on every
 * `PublicPlayer`, folded by the server from its own ledger — a client that works
 * out its own placings is a client that can be edited into first place, and this
 * one runs on the guests' phones.
 *
 * It used to sort by score and number the result. That was the client deriving
 * standings, it disagreed between the television and the phone whenever a tie
 * broke differently, and it produced no movement arrows at all for a phone that
 * reconnected mid-animation. The server sends both numbers now; this file's only
 * job is to put the rows in order.
 */

/** Ascending by `rank`, which the server guarantees is 1-based, gapless and unshared. */
export function byRank(players: PublicPlayer[]): PublicPlayer[] {
  return [...players].sort((a, b) => a.rank - b.rank);
}

/**
 * Ascending by `place` — the scorecard's order for the screen that ends a game.
 *
 * **A different number from `rank`, deliberately.** `place` is within the game
 * that just ended, and **ties share it and push the next player past**: two 2nds
 * and no 3rd. `rank` is the evening's standing and is gapless and unshared
 * because a podium seats exactly three people. Sorting is stable, so players
 * sharing a place keep the order the server sent them in, and nothing here
 * renumbers a tie to make the column look tidy.
 */
export function byPlace(scorecard: ScorecardRow[]): ScorecardRow[] {
  return [...scorecard].sort((a, b) => a.place - b.place);
}

/**
 * Where a player moved since the last completed game.
 *
 * `null` means there is nothing to say — either no game has been scored yet, or
 * they did not move. Both render as no arrow, which is deliberate: a dash next
 * to eleven of fifteen names is noise, and the arrows only mean anything if the
 * eye can find them.
 */
export function movementOf(player: PublicPlayer): { direction: 'up' | 'down'; places: number } | null {
  if (player.previousRank === null || player.previousRank === player.rank) return null;
  return player.previousRank > player.rank
    ? { direction: 'up', places: player.previousRank - player.rank }
    : { direction: 'down', places: player.rank - player.previousRank };
}
