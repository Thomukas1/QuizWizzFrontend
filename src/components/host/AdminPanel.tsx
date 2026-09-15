import { useEffect, useState } from 'react';
import { JoinPanel } from './JoinPanel';
import type { HostCommand } from '../services/quizwizz';

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

  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(id);
  }, [armed]);

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
          Disabled, and it should be. `back` is only meaningful from ROUND_INTRO
          and SCOREBOARD; everywhere else the server answers `not_allowed`. It
          is here now so the remote has the shape it will keep — a control that
          appears halfway through a project is a control nobody's thumb expects.
        */}
        <button type="button" className="admin-btn admin-btn--ghost" disabled title="Not yet — no phase can go back">
          ← Back
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
