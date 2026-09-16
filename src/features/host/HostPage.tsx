import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AdminPanel } from '../../components/host/AdminPanel';
import type { EmojiFeed } from '../../components/EmojiStream';
import { Leaderboard } from '../../components/Leaderboard';
import { byRank } from '../../components/standings';
import { clearHostToken, readHostToken, resetStore } from '../../services/quizwizz';
import { useHostCommand, useQuizWizz, useSpaceToAdvance } from '../../hooks/quizwizz';
import { useViewMode } from '../../hooks/useViewMode';
import { HostFinalScene } from './HostFinalScene';
import { HostLobbyScene } from './HostLobbyScene';
import { HostGameScene } from './HostGameScene';
import { HostResultsScene } from './HostResultsScene';

/** Hostnames that mean "this device" and so mean nothing to a phone. */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * **The television.** The host connection, the show, and the only client allowed
 * to send commands. There is no separate admin view — this is it.
 *
 * Three slices, fixed all evening: an empty panel, the game zone, the
 * leaderboard. Only the zone changes, which is why the leaderboard never
 * re-mounts and never loses its scroll position when the phase moves.
 *
 * Everything it draws with is host-shaped and lives in `components/host/` — the
 * game zone, the remote, the QR panel, the podium, the confetti. Nothing here
 * imports from `components/player/`, and nothing on the phone imports from
 * here: a screen read from three metres and a screen held in a hand have almost
 * nothing in common, and the handful of things that genuinely do — an avatar, a
 * row of standings, an emoji rising — sit at the root of `components/`.
 */
export default function HostPage() {
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
    //
    // Except on a dev machine: the host opens `localhost:5173`, and `localhost`
    // on the phone reading the QR is the phone. `vite --host` binds the LAN
    // address too and the config plugin hands it over, so prefer it whenever the
    // page is being served from loopback. A relative `joinUrl` follows along; an
    // absolute one from the server is a deliberate answer and is left alone.
    const origin =
      LOOPBACK.has(window.location.hostname) && window.__LAN_ORIGIN__
        ? window.__LAN_ORIGIN__
        : window.location.origin;
    return new URL(fromLogin || '/play', origin).href;
  }, [location.state]);

  const feed = useMemo<EmojiFeed | null>(
    () => (state.burst ? { seq: state.burst.seq, emojis: state.burst.items.map(i => i.emoji) } : null),
    [state.burst],
  );

  const standings = useMemo(() => byRank(state.players), [state.players]);

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
          // Medals and movement are both withheld in the lobby: every score is
          // zero there, so the order is join order, and a gold border on
          // whoever scanned first would be a podium the game hasn't played yet.
          //
          // **This is what replaced the SCOREBOARD phase.** It is on screen from
          // the first join to the podium, so a phase whose only job was to show
          // it was showing the same list twice.
          <Leaderboard rows={standings} size="lg" autoScroll medals={!inLobby} movement={!inLobby} />
        )}
      </aside>

      {/*
        Four phases, four scenes, and `GAME` is the only one the engine doesn't
        draw. A blank zone mid-party reads as broken to a room of fifteen at
        once, so every phase has something — including the beat before a game's
        first frame lands, which `<HostGameScene>` handles itself.
      */}
      {state.phase === 'GAME' ? (
        <HostGameScene view={state.view} players={state.players} feed={feed} />
      ) : state.phase === 'RESULTS' ? (
        <HostResultsScene
          game={state.game}
          upNext={state.upNext}
          scorecard={state.scorecard}
          players={state.players}
          feed={feed}
        />
      ) : state.phase === 'FINAL' ? (
        <HostFinalScene players={state.players} feed={feed} />
      ) : (
        <HostLobbyScene feed={feed} />
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
          phase={state.phase}
          game={state.game}
          upNext={state.upNext}
          gameCount={state.gameCount}
        />
      </aside>

      {toast && <div className="host-stage__toast" role="status">{toast}</div>}
    </div>
  );
}
