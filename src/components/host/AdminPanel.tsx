import { useEffect, useState } from 'react';
import { JoinPanel } from './JoinPanel';
import type { HostCommand } from '../../services/quizwizz';

/**
 * **The remote.** Every host command lives here, so the game zone never has a
 * control in it.
 *
 * Parked on the right-hand panel for now because the territory was empty and
 * the commands had nowhere else to be. The eventual home is the host's own
 * phone — standing at a laptop is the worst possible place to run a room from —
 * and when that happens this component moves rather than being rewritten: it
 * already takes nothing but a `command` function and a phase.
 *
 * Space still sends `next`, and that stays the primary control. These buttons
 * exist because a mouse is what you reach for when the room is watching and you
 * don't want to look like you're typing.
 */

interface AdminPanelProps {
  command: (cmd: HostCommand, args?: Record<string, unknown>) => void;
  /** Ends the session locally too — clears the token and returns to the gate. */
  onEndGame: () => void;
  /** Disables the remote while there's no socket to send down. */
  connected: boolean;
  /** The session is already over. Nothing left to command; offer the way out. */
  ended: boolean;
  /** Where phones go. Kept on screen all evening — see `JoinPanel`. */
  joinUrl: string;
  code: string | null;
}

export function AdminPanel({
  command,
  onEndGame,
  connected,
  ended,
  joinUrl,
  code,
}: AdminPanelProps) {
  // Ending a game wipes it for everyone in the room, and this button shares a
  // panel with one you press all evening. So it arms first: one click to mean
  // it, a second to do it. Cheaper than a modal and it disarms itself.
  const [armed, setArmed] = useState(false);
  // Same treatment for Skip: it ends the running game with no awards, so it
  // costs everyone the points they were playing for and it sits next to the
  // button you press all evening.
  const [skipArmed, setSkipArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(id);
  }, [armed]);

  useEffect(() => {
    if (!skipArmed) return;
    const id = setTimeout(() => setSkipArmed(false), 4000);
    return () => clearTimeout(id);
  }, [skipArmed]);

  return (
    <div className="admin-panel">
      <div className="admin-panel__actions">
        {/* Once the session is over there is nothing to protect, so the arming
            step goes and the same button becomes the way out. Reusing it keeps
            the panel from growing a control that only ever appears once. */}
        <button
          type="button"
          className={`admin-btn ${ended ? 'admin-btn--next' : 'admin-btn--danger'}${armed ? ' admin-btn--armed' : ''}`}
          disabled={!ended && !connected}
          onClick={() => {
            if (ended) return onEndGame();
            if (!armed) return setArmed(true);
            onEndGame();
          }}
        >
          {ended ? 'Start a new game' : armed ? 'Tap again to wipe' : 'End game'}
        </button>
      </div>

      {/* The way in, on screen for the whole evening rather than only while the
          lobby is up. Somebody's phone always drops. */}
      <div className="admin-panel__body">
        <JoinPanel joinUrl={joinUrl} code={code} />
      </div>

      <div className="admin-panel__remote">
        {/*
          The escape hatch, and the reason an unclaimed `next` during GAME can
          safely be refused: `skipGame` force-ends the running game with no
          awards without consulting the module, so a format that has hung — or
          one nobody wants to sit through — can't hold the evening hostage.

          Armed like the wipe button, because it silently costs everyone the
          points they were playing for.
        */}
        <button
          type="button"
          className={`admin-btn admin-btn--ghost${skipArmed ? ' admin-btn--armed' : ''}`}
          disabled={!connected}
          title="End the running game with no points awarded"
          onClick={() => {
            if (!skipArmed) return setSkipArmed(true);
            setSkipArmed(false);
            command('skipGame');
          }}
        >
          {skipArmed ? 'Tap to skip' : 'Skip ↦'}
        </button>

        <button
          type="button"
          className="admin-btn admin-btn--next"
          disabled={!connected}
          onClick={() => command('next')}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
