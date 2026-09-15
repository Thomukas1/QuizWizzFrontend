import { Avatar } from '../Avatar';
import { ArmedButton } from '../../primitives/ArmedButton';
import type { QuizWizzState } from '../../services/quizwizz';

/**
 * **Who you are, full width, all evening.**
 *
 * The only part of the phone that survives every phase. Intermissions swap the
 * whole body out and a live round hands it to the game module, but this strip
 * stays put — which is what makes the two feel like one device rather than a
 * sequence of screens.
 *
 * It renders nothing of its own: the name and the face arrive in
 * `snapshot.you`, straight from the server.
 *
 * **The score used to live on the right and now the way out does.** The score is
 * two taps away at most — it is in the standings, which are the whole of what an
 * intermission shows, and it is the one number the room reads off the television
 * together. Leaving a game is the thing you cannot do from anywhere else, and a
 * phone with no exit is why somebody's brother ends up in the roster all night.
 */
export function PlayerHeader({
  you,
  onQuit,
}: {
  you: QuizWizzState['you'];
  /** Drops the pass and goes back to the join form. Armed — see `ArmedButton`. */
  onQuit: () => void;
}) {
  return (
    <header className="player-header">
      {you ? (
        <>
          <Avatar avatar={you.avatar} size={40} seed={you.playerId} />
          <span className="player-header__name">{you.name}</span>
          {/* Two taps, because this is a one-way door: quitting drops the token
              and the playerId, and coming back is a fresh join with a fresh
              score. It sits a thumb's width from the reaction bar on a phone
              being waved around, which is exactly the button not to make live on
              a single touch. */}
          <ArmedButton
            className="player-header__quit"
            armedClassName="player-header__quit--armed"
            label="Quit"
            confirmLabel="Really?"
            onConfirm={onQuit}
          />
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
