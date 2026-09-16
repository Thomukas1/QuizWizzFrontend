import { Leaderboard } from '../Leaderboard';
import type { PublicPlayer } from '../../services/quizwizz';

/**
 * **Where you stand, before the list of where everybody else does.**
 *
 * The one question a phone gets asked at every intermission is "what am I?", and
 * answering it used to mean scrolling a column of fifteen names looking for your
 * own. The television can't offer this — it has no idea whose eyes are on it —
 * which is exactly why the phone should.
 *
 * **It is the same row, not a similar one.** This renders `<Leaderboard>` with a
 * single row in it rather than reimplementing the rank, the avatar, the movement
 * arrow and the score, so the card and the line further down the list can never
 * disagree about what you scored. What is different is the frame around it: a
 * label, a lift off the background, and a gap underneath that separates "you"
 * from "the room".
 *
 * Your row stays in the list below as well. Pulling it out would be a different
 * feature — it would mean the standings no longer show the standings — and the
 * point of this card is that you don't have to *find* yourself, not that you
 * stop being in the running order.
 */
export function SelfStanding({
  me,
  medals,
  movement,
}: {
  /** Your own row out of the roster — the server's, not one assembled here. */
  me: PublicPlayer;
  /** Passed straight through, so the card medals and moves exactly when the list does. */
  medals: boolean;
  movement: boolean;
}) {
  return (
    <div className="self-standing">
      <span className="self-standing__label">You</span>
      <Leaderboard rows={[me]} size="sm" medals={medals} movement={movement} />
    </div>
  );
}
