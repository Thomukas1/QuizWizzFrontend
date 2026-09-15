import { useMemo } from 'react';
import { Leaderboard } from '../../components/Leaderboard';
import { rankPlayers } from '../../components/standings';
import type { PublicPlayer } from '../../services/quizwizz';

/**
 * **FINAL, on the phone.** The full standings and nothing else.
 *
 * No podium, no confetti: the television is doing the celebrating and a phone
 * competing with it just splits the room's attention at the one moment it was
 * all pointed the same way. What the phone is *for* here is the thing the TV
 * can't offer — scrolling back to find your own name at your own pace, which is
 * also why this list doesn't auto-scroll.
 *
 * The top three keep their gold, silver and bronze, so a glance still says who
 * won without a second layout.
 */
export function PlayerFinal({
  players,
  onLeave,
}: {
  players: PublicPlayer[];
  onLeave: () => void;
}) {
  const ranked = useMemo(() => rankPlayers(players), [players]);

  return (
    <div className="phone-final">
      <p className="eyebrow">Final standings</p>
      <Leaderboard rows={ranked} size="sm" />
      {/* FINAL is terminal — the server's `next` from here returns FINAL, so
          there is no round to wait for. Without this the phone holds a pass to a
          finished game and only a reload gets it to the next one. */}
      <button type="button" className="phone-final__leave" onClick={onLeave}>
        Join a new game
      </button>
    </div>
  );
}
