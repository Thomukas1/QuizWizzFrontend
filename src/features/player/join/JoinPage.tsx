import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Wordmark } from '../../components/Wordmark';
import { RoomCode } from '../../components/RoomCode';
import {
  NAME_MAX_LENGTH,
  clearPlayerIdentity,
  readPlayerIdentity,
  resetStore,
} from '../../services/quizwizz';
import { useJoin, useLiveSession } from '../../hooks/quizwizz';
import { useViewMode } from '../../hooks/useViewMode';
import { AvatarSlider } from './AvatarSlider';

/**
 * **The phone's door.** No room code to type — there is one live session and the
 * QR code on the television was the invitation, so the code at the top is
 * confirmation rather than input.
 *
 * `live: false` is a state of this page, not an error: people scan the code
 * before the host presses Start, and `useLiveSession` polls so the "no game yet"
 * message becomes a form by itself.
 */
export default function JoinPage() {
  useViewMode('player');

  const navigate = useNavigate();
  const { data: session, loading: checking } = useLiveSession();
  const { join, loading, error, field } = useJoin();

  const [emoji, setEmoji] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState(readPlayerIdentity);

  /**
   * **Is the pass in this phone's pocket for the game that is actually running?**
   *
   * A token outlives the session it was minted for, and the server keeps ended
   * sessions in memory — so a pass from a finished game still resolves, and is
   * refused forever. Without this check the phone rejoined the dead game on
   * every load and never saw a join form again.
   *
   * Compared against the live code rather than assumed: `live: false` means the
   * pass is certainly dead, a different code means it belongs to a previous
   * game, and a matching code means walk straight in.
   */
  const liveCode = session?.live ? session.code : null;
  // Only when the server actually answered. A fetch that failed leaves `session`
  // null, and throwing away a good pass over one dropped request would sign
  // someone out mid-game for a blip.
  const knownDead = session ? !session.live : false;
  const stale = !!identity && (knownDead || (!!liveCode && identity.code !== liveCode));

  useEffect(() => {
    if (!stale) return;
    clearPlayerIdentity();
    // The old game's roster and rev counter must not bleed into the next one.
    resetStore();
    setIdentity(null);
  }, [stale]);

  // Already in *this* game — closed the tab, locked the phone, came back. The
  // socket re-authenticates and repaints from the snapshot.
  if (identity && !stale && liveCode) return <Navigate to="/play/game" replace />;

  const ready = !!emoji && name.trim().length > 0 && !loading;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || !emoji) return;
    const joined = await join(name.trim(), { kind: 'emoji', emoji });
    if (joined) navigate('/play/game', { replace: true });
  }

  if (checking && !session) {
    return <p className="p-3xl text-center subtle">Looking for a game…</p>;
  }

  if (session && !session.live) {
    return (
      <div className="p-3xl flex flex-col gap-lg items-center text-center">
        <Wordmark size="var(--font-size-xl)" />
        <p className="subtle">No game running yet.</p>
        <p className="subtle text-sm">
          Keep this open — it'll turn into a join form the moment the host starts.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="p-lg flex flex-col gap-xl">
      <div className="flex flex-col items-center gap-md">
        <Wordmark size="var(--font-size-xl)" />
        {session?.code && (
          <div className="flex items-center gap-md">
            <span className="subtle text-sm">Joining</span>
            <RoomCode code={session.code} size="var(--font-size-lg)" />
          </div>
        )}
      </div>

      <div>
        <p className="eyebrow mb-sm">Pick your face</p>
        <AvatarSlider selected={emoji} onSelect={setEmoji} />
        {field === 'avatar' && error && (
          <p className="text-sm" style={{ color: 'var(--color-error)' }} role="alert">{error}</p>
        )}
      </div>

      <div>
        <label htmlFor="nickname">
          Nickname
          <span className="field-label-hint">
            {' '}{name.length}/{NAME_MAX_LENGTH}
          </span>
        </label>
        <input
          id="nickname"
          type="text"
          // Capped here so `name_too_long` can never come back from the server.
          maxLength={NAME_MAX_LENGTH}
          autoComplete="nickname"
          enterKeyHint="go"
          value={name}
          onChange={event => setName(event.target.value)}
          className={field === 'name' ? 'error' : undefined}
          placeholder="Ada"
        />
        {field === 'name' && error && (
          <p className="text-sm mt-sm" style={{ color: 'var(--color-error)' }} role="alert">{error}</p>
        )}
      </div>

      {/* A failure that belongs to neither control — the room is full, the game
          ended between the poll and the tap. */}
      {field === null && error && (
        <p className="text-center text-sm" style={{ color: 'var(--color-error)' }} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="special" disabled={!ready}>
        {loading ? 'Joining…' : 'Join'}
      </button>
    </form>
  );
}
