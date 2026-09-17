import { BotControl } from './BotControl';
import { JoinPanel } from './JoinPanel';
import { NextUp } from './NextUp';
import { ArmedButton } from '../../primitives/ArmedButton';
import type { GameRef, GameRun, HostCommand, Phase } from '../../services/quizwizz';

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
  // ── Everything below is `<NextUp>`'s, and passed straight through ──────────
  /** What the transport is pointing at, and the only branch it makes. */
  phase: Phase | null;
  game: GameRun | null;
  upNext: GameRef | null;
  gameCount: number;
}

export function AdminPanel({
  command,
  onEndGame,
  connected,
  ended,
  joinUrl,
  code,
  phase,
  game,
  upNext,
  gameCount,
}: AdminPanelProps) {
  return (
    <div className="admin-panel">
      {/* The harness, above the band the real controls live in and rendered only
          in development — it is scaffolding, not a feature, and it should read
          that way from across the room. `<BotControl>` returns null in a build. */}
      <BotControl connected={connected} />

      <div className="admin-panel__actions">
        {/* Once the session is over there is nothing to protect, so the arming
            step goes and the button becomes the plain way out — the same slot,
            so the panel never grows a control that only ever appears once.
            Ending a *live* game wipes it for everyone in the room, and this
            shares a panel with a button you press all evening, so that one arms
            first: one click to mean it, a second to do it. */}
        {ended ? (
          <button type="button" className="admin-btn admin-btn--next" onClick={onEndGame}>
            Start a new game
          </button>
        ) : (
          <ArmedButton
            className="admin-btn admin-btn--danger"
            armedClassName="admin-btn--armed"
            disabled={!connected}
            label="End game"
            confirmLabel="Tap again to wipe"
            onConfirm={onEndGame}
          />
        )}
      </div>

      {/* The way in, on screen for the whole evening rather than only while the
          lobby is up. Somebody's phone always drops. */}
      <div className="admin-panel__body">
        <JoinPanel joinUrl={joinUrl} code={code} />
      </div>

      {/* The transport, and the whole of it: what is coming, and the two ways to
          reach it. The playlist picker that used to sit in the band above was
          answering the same question this does — what Space will do next — and
          two controls answering one question is how you end up with neither of
          them saying it. */}
      <div className="admin-panel__remote">
        <NextUp
          phase={phase}
          game={game}
          upNext={upNext}
          gameCount={gameCount}
          command={command}
          connected={connected}
        />
      </div>
    </div>
  );
}
