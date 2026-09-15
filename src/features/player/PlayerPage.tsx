import { useCallback, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { EmojiStream } from '../../components/EmojiStream';
import type { EmojiFeed } from '../../components/EmojiStream';
import { ReactionBar } from '../../components/ReactionBar';
import { clearPlayerIdentity, readPlayerIdentity, resetStore } from '../../services/quizwizz';
import { usePlayerActions, useQuizWizz } from '../../hooks/quizwizz';
import { useViewMode } from '../../hooks/useViewMode';
import { PlayerFinal } from '../final/PlayerFinal';

/**
 * **The controller.** Slim, no sound, no animation past button feedback — the
 * television is the show and this is a gamepad.
 *
 * Three rows in every phase: who you are, the phase, the reactions. Only the
 * middle one changes, so the identity strip and the reaction bar never move
 * between screens.
 */
export default function PlayPage() {
  useViewMode('player');

  const navigate = useNavigate();

  // Read once. The socket clears this on a kick, and re-reading would redirect
  // the phone to the join form before it could say why it stopped.
  const identity = useMemo(() => readPlayerIdentity(), []);
  const state = useQuizWizz(identity ? 'player' : null);
  const { react } = usePlayerActions(state.round?.roundId ?? null);

  /**
   * Local pops, not the server's burst.
   *
   * A phone shows its *own* taps immediately — the round trip through
   * `react:burst` is 100ms of batching plus the network, and a button that
   * waits that long to respond feels broken. The server's bursts go to the
   * television, which is where they mean something: they are the room's
   * reaction, not your own.
   */
  const [feed, setFeed] = useState<EmojiFeed | null>(null);

  // Drop the pass and start over. `resetStore` matters as much as the token: the
  // store's rev high-water mark is module-scope, and carrying it into the next
  // game would silently reject every frame of it.
  const leave = useCallback(() => {
    clearPlayerIdentity();
    resetStore();
    navigate('/play', { replace: true });
  }, [navigate]);

  if (!identity) return <Navigate to="/play" replace />;

  const you = state.you;
  const isFinal = state.phase === 'FINAL';

  return (
    <div className="phone-shell">
      <header className="phone-shell__identity">
        {you ? (
          <>
            <Avatar avatar={you.avatar} size={40} seed={you.playerId} />
            <span className="phone-shell__name">{you.name}</span>
            <span className="phone-shell__score">
              {you.score}<span>pts</span>
            </span>
          </>
        ) : (
          <span className="subtle text-sm">Connecting…</span>
        )}
      </header>

      {state.ending ? (
        <div className="phone-shell__status phone-shell__status--error">
          <span>{state.ending.message}</span>
          {/* Every ending is final for this pass — kicked, expired, or the game
              simply over — so there is exactly one thing left to offer. Without
              it the phone is a dead end with no route back to a running game. */}
          <button type="button" className="phone-shell__status-action" onClick={leave}>
            Join a new game
          </button>
        </div>
      ) : state.status === 'reconnecting' ? (
        // True, and worth saying: a disconnect never removes anyone from the
        // roster and never discards a submitted answer. It stops people
        // frantically reloading, which is what actually loses their place.
        <p className="phone-shell__status phone-shell__status--warn">
          Reconnecting… your answers are safe
        </p>
      ) : null}

      <main className={`phone-shell__phase${isFinal ? ' phone-shell__phase--fill' : ''}`}>
        {/* Behind the content and clipped to this row, so a reaction rises out
            from under the bar and stops before it reaches your own name. */}
        <EmojiStream feed={feed} variant="overlay" />

        {isFinal ? (
          <PlayerFinal players={state.players} onLeave={leave} />
        ) : (
          <div className="phone-shell__waiting">
            {state.phase === 'LOBBY' || state.phase === null ? (
              <>
                <p className="phone-shell__waiting-title">You're in</p>
                {you && <Avatar avatar={you.avatar} size={96} seed={you.playerId} />}
                <p className="subtle">Waiting for players…</p>
                <p className="subtle text-sm">
                  {state.players.length} {state.players.length === 1 ? 'player' : 'players'} in —
                  look at the big screen.
                </p>
              </>
            ) : (
              <p className="phone-shell__waiting-title">{state.round?.title ?? state.phase}</p>
            )}
          </div>
        )}
      </main>

      <ReactionBar
        onReact={emoji => {
          react(emoji);
          setFeed(current => ({ seq: (current?.seq ?? 0) + 1, emojis: [emoji] }));
        }}
      />
    </div>
  );
}
