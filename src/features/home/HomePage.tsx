import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wordmark } from '../../components/Wordmark';
import { useHostLogin, useLiveSession } from '../../hooks/quizwizz';
import { useViewMode } from '../../hooks/useViewMode';

/**
 * **The host's door**, and the app's front page.
 *
 * `auto` view: this is the one screen that has to read on a television and on a
 * phone, because the person opening it might be setting up the room from either.
 * A centred card does that without a second layout.
 *
 * It also doubles as the browser gesture that unlocks audio — Chrome silently
 * refuses to play sound before a click, and you will otherwise spend an evening
 * convinced the audio code is broken. Nothing plays sound yet; the gesture is
 * here for when it does.
 */
export default function HomePage() {
  useViewMode('auto');

  const navigate = useNavigate();
  const { login, loading, error } = useHostLogin();
  const { data: session } = useLiveSession();
  const [password, setPassword] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!password || loading) return;
    const result = await login(password);
    // `joinUrl` is the server's answer to "where do phones go", and it only
    // exists in this response. Handed forward rather than stored — the lobby
    // falls back to this origin, which is right whenever the two are one app.
    if (result) navigate('/host', { state: { joinUrl: result.joinUrl } });
  }

  return (
    <div className="w-full flex flex-col gap-3xl">
      <Wordmark size="clamp(28px, 7vw, 44px)" />

      <form onSubmit={submit} className="frosted-card flex flex-col gap-xl">
        <div>
          <label htmlFor="host-password">Host password</label>
          <input
            id="host-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={event => setPassword(event.target.value)}
            className={error ? 'error' : undefined}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: 'var(--color-error)' }} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="special" disabled={!password || loading}>
          {loading ? 'Starting…' : 'Start'}
        </button>
      </form>

      {/* A running game is resumed, not replaced — but say so before the click,
          because from here it looks exactly like starting a new one. */}
      {session?.live && (
        <p
          className="text-center text-sm"
          style={{ color: 'var(--color-warning)' }}
        >
          A game is already running ({session.playerCount}{' '}
          {session.playerCount === 1 ? 'player' : 'players'}) — Start resumes it.
        </p>
      )}

      <p className="text-center subtle text-sm">
        Playing, not hosting? Open the link on the screen, or{' '}
        <a href="/play" style={{ color: 'var(--accent)' }}>join here</a>.
      </p>
    </div>
  );
}
