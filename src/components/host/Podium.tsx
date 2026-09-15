import { Avatar } from '../Avatar';
import type { PublicPlayer } from '../../services/quizwizz';

/**
 * The top three, on the box.
 *
 * First in the middle and highest, second to its left, third to its right and
 * lower again — the shape everyone already knows, so the room reads the result
 * before it reads a single number.
 *
 * Rendered in rank order and *placed* with `order`, so the DOM says first,
 * second, third while the screen says second, first, third. A screen reader and
 * a copy-paste both get the standings; only the eye gets the arrangement.
 */

/** Decoration, not protocol — these never cross the wire, so they live here. */
const MEDALS = ['🥇', '🥈', '🥉'];

export function Podium({ top }: { top: PublicPlayer[] }) {
  return (
    <div className="podium">
      {top.slice(0, 3).map(player => (
        <div key={player.id} className={`podium__card podium__card--${player.rank}`}>
          <span className="podium__medal" aria-hidden="true">{MEDALS[player.rank - 1]}</span>
          <Avatar
            avatar={player.avatar}
            size={player.rank === 1 ? 132 : 104}
            seed={player.id}
            offline={!player.connected}
          />
          <span className="podium__name">{player.name}</span>
          <span className="podium__score">{player.score}</span>
        </div>
      ))}
    </div>
  );
}
