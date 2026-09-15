import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AdminPanel } from '../../components/AdminPanel';
import type { EmojiFeed } from '../../components/EmojiStream';
import { GameZone } from '../../components/GameZone';
import { Leaderboard } from '../../components/Leaderboard';
import { rankPlayers } from '../../components/standings';
import { clearHostToken, readHostToken, resetStore } from '../../services/quizwizz';
import { useHostCommand, useQuizWizz, useSpaceToAdvance } from '../../hooks/quizwizz';
import { useViewMode } from '../../hooks/useViewMode';
import { HostFinal } from '../final/HostFinal';
import { LobbyScene } from './LobbyScene';

/**
 * **The television.** The host connection, the show, and the only client allowed
 * to send commands. There is no separate admin view — this is it.
 *
 * Three slices, fixed all evening: an empty panel, the game zone, the
 * leaderboard. Only the zone changes, which is why the leaderboard never
 * re-mounts and never loses its scroll position when the phase moves.
 */
export default function LobbyPage() {
  useViewMode('host');

  const location = useLocation();
  const navigate = useNavigate();
  // Read once, before the socket can clear it: a token wiped by an ending would
  // otherwise bounce the screen to the password gate mid-render, taking the
  // "the game has ended" message with it.
  const hasToken = useMemo(() => !!readHostToken(), []);
  const state = useQuizWizz(hasToken ? 'host' : null);

  const command = useHostCommand();
  useSpaceToAdvance(state.status === 'open');

  /**
   * Wipe the game and come back as a stranger.
   *
   * `endSession` marks the session ended server-side, which drops it out of
   * `liveSession()` — so the next host login mints a brand new one rather than
   * resuming this corpse. Locally the token has to go with it, or `/host` would
   * reconnect on the next load and be refused; and the store has to be reset, or
   * its `rev` high-water mark would reject every frame of the next game.
   */
  const ended = !!state.ending;
  const endGame = useCallback(() => {
    // A session that already ended needs no command — sending one would earn a
    // `session_ended` refusal and raise a toast on the way out the door.
    if (!ended) command('endSession');
    clearHostToken();
    resetStore();
    navigate('/', { replace: true });
  }, [command, navigate, ended]);

  const joinUrl = useMemo(() => {
    const fromLogin = (location.state as { joinUrl?: string } | null)?.joinUrl;
    // The server answers a relative `/play` unless QUIZWIZZ_PLAY_URL is set, so
    // resolve against this origin — which is also the right fallback on a reload,
    // when there is no login response to read.
    return new URL(fromLogin || '/play', window.location.origin).href;
  }, [location.state]);

  const feed = useMemo<EmojiFeed | null>(
    () => (state.burst ? { seq: state.burst.seq, emojis: state.burst.items.map(i => i.emoji) } : null),
    [state.burst],
  );

  const standings = useMemo(() => rankPlayers(state.players), [state.players]);

  // A refused command, for three seconds in the corner. The store hands over a
  // fresh object per refusal, so an identical repeat still restarts the timer.
  const { refusal } = state;
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!refusal) return;
    setToast(refusal.message);
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [refusal]);

  if (!hasToken) return <Navigate to="/" replace />;

  const inLobby = state.phase === 'LOBBY' || state.phase === null;

  return (
    <div className="host-stage">
      {/* Standings on the left — what the room looks at — and the remote on the
          right, which only the host touches. Both stay mounted all evening, so
          neither re-mounts or loses its scroll position when the phase moves. */}
      <aside className="host-stage__panel host-stage__panel--left">
        <div className="host-stage__panel-title">
          <span className="eyebrow">Leaderboard</span>
          <span className="host-stage__panel-count">Players: {state.players.length}</span>
        </div>

        {state.ending ? (
          <p className="host-stage__panel-status">{state.ending.message}</p>
        ) : state.status !== 'open' ? (
          <p className="host-stage__panel-status">
            {state.status === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'}
          </p>
        ) : null}

        {standings.length === 0 ? (
          <p className="host-stage__panel-empty">Nobody yet</p>
        ) : (
          // Medals are withheld in the lobby: every score is zero there, so the
          // order is join order, and a gold border on whoever scanned first
          // would be a podium the game hasn't played yet.
          <Leaderboard rows={standings} size="lg" autoScroll medals={!inLobby} />
        )}
      </aside>

      {/* Every scene renders in here, including a game's <Display> when there
          is one. A blank zone mid-party reads as broken, so every phase has
          something. */}
      {inLobby ? (
        <LobbyScene feed={feed} />
      ) : state.phase === 'FINAL' ? (
        <HostFinal players={state.players} feed={feed} />
      ) : (
        <GameZone feed={feed} top={<h2 className="game-zone__title">{state.phase}</h2>}>
          <p className="subtle">{state.round?.title ?? 'Coming up…'}</p>
        </GameZone>
      )}

      <aside className="host-stage__panel host-stage__panel--right">
        <span className="eyebrow">Admin</span>
        <AdminPanel
          command={command}
          onEndGame={endGame}
          connected={state.status === 'open'}
          ended={ended}
          joinUrl={joinUrl}
          code={state.code}
        />
      </aside>

      {toast && <div className="host-stage__toast" role="status">{toast}</div>}
    </div>
  );
}
