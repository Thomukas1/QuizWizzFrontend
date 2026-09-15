import { Avatar } from '../Avatar';
import type { QuizWizzState } from '../../services/quizwizz';

/**
 * **Who you are, full width, all evening.**
 *
 * The only part of the phone that survives every phase. Intermissions swap the
 * whole body out and a live round hands it to the game module, but this strip
 * stays put — which is what makes the two feel like one device rather than a
 * sequence of screens. It is also the answer to the question people actually
 * ask mid-game, which is "how many points do I have", and they should never
 * have to change screens to get it.
 *
 * It renders nothing of its own: the name, the face and the score all arrive in
 * `snapshot.you`, and the score in particular is the server's fold of its own
 * ledger. A phone that added up its own points would be a phone that could be
 * edited into first place.
 */
export function PlayerHeader({ you }: { you: QuizWizzState['you'] }) {
  return (
    <header className="player-header">
      {you ? (
        <>
          <Avatar avatar={you.avatar} size={40} seed={you.playerId} />
          <span className="player-header__name">{you.name}</span>
          <span className="player-header__score">
            {you.score}
            <span>pts</span>
          </span>
        </>
      ) : (
        // The gap between "the socket is open" and "the first snapshot landed".
        // The strip keeps its height through it, so nothing below jumps down the
        // screen a beat after the page appears.
        <span className="subtle text-sm">Connecting…</span>
      )}
    </header>
  );
}
