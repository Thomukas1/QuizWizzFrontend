import { useCallback, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PlayerHeader } from '../../components/player/PlayerHeader';
import { clearPlayerIdentity, readPlayerIdentity, resetStore } from '../../services/quizwizz';
import { usePlayerActions, useQuizWizz } from '../../hooks/quizwizz';
import { useViewMode } from '../../hooks/useViewMode';
import { PlayerGame } from './PlayerGame';
import { PlayerIntermission } from './PlayerIntermission';

/**
 * **The controller.** Slim, no sound, no animation past button feedback — the
 * television is the show and this is a gamepad.
 *
 * The shell is two things and one decision: the header, which never moves, and
 * the scene below it, which is either an intermission or a round. It owns no
 * layout of its own beyond that, and in particular it no longer owns the
 * reaction bar — the bar belongs to the intermission, which is the whole of what
 * "reactions only between games" means in this codebase.
 *
 * Everything host-shaped is somewhere else. Nothing on this route imports from
 * `components/host/`, and nothing there imports from here; the two views share
 * only what is genuinely the same object on both screens — an avatar, a row of
 * standings, an emoji floating upwards.
 */
export default function PlayerPage() {
  useViewMode('player');

  const navigate = useNavigate();

  // Read once. The socket clears this on a kick, and re-reading would redirect
  // the phone to the join form before it could say why it stopped.
  const identity = useMemo(() => readPlayerIdentity(), []);
  const state = useQuizWizz(identity ? 'player' : null);
  // Bound to the frame's `runId`, not the phase's game: a submission is pinned
  // to the exact playthrough that projected the controls it was typed into.
  const { react, answer, input } = usePlayerActions(state.view?.runId ?? null);

  // Drop the pass and start over. `resetStore` matters as much as the token: the
  // store's rev high-water mark is module-scope, and carrying it into the next
  // game would silently reject every frame of it.
  const leave = useCallback(() => {
    clearPlayerIdentity();
    resetStore();
    navigate('/play', { replace: true });
  }, [navigate]);

  if (!identity) return <Navigate to="/play" replace />;

  /**
   * **The one branch this page makes.** `GAME` means a module owns the screen;
   * anything else means the engine does. There is no table and no predicate —
   * the question "is a round happening" *is* the phase.
   *
   * An ending overrides it regardless of the phase it stopped on: a kicked
   * player is not mid-game whatever the last frame said, and a dead controller
   * is worse than the standings and a way out.
   */
  const playing = state.phase === 'GAME' && !state.ending;

  return (
    <div className="player-shell">
      <PlayerHeader you={state.you} />

      {state.ending ? (
        <div className="player-shell__status player-shell__status--error">
          <span>{state.ending.message}</span>
          {/* Every ending is final for this pass — kicked, expired, or the game
              simply over — so there is exactly one thing left to offer. Without
              it the phone is a dead end with no route back to a running game. */}
          <button type="button" className="player-shell__status-action" onClick={leave}>
            Join a new game
          </button>
        </div>
      ) : state.status === 'reconnecting' ? (
        // True, and worth saying: a disconnect never removes anyone from the
        // roster and never discards a submitted answer. It stops people
        // frantically reloading, which is what actually loses their place.
        <p className="player-shell__status player-shell__status--warn">
          Reconnecting… your answers are safe
        </p>
      ) : null}

      <main className="player-shell__scene">
        {playing ? (
          <PlayerGame view={state.view} you={state.you} answer={answer} input={input} />
        ) : (
          <PlayerIntermission
            phase={state.phase}
            players={state.players}
            upNext={state.upNext}
            onReact={react}
            onLeave={leave}
          />
        )}
      </main>
    </div>
  );
}
