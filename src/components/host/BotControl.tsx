import { Avatar } from '../Avatar';
import { addBot, removeAllBots } from '../../services/quizwizz';
import { useBots } from '../../hooks/quizwizz';

/**
 * **The test harness, in the corner of the remote.**
 *
 * One button that mints an NPC player — a random `botNNNN` and a random face off
 * `AVATAR_EMOJI` — which joins through the ordinary door and then answers every
 * question it is shown at random. Nothing downstream knows the difference: a bot
 * is in the roster, the standings, the "12 / 15 locked in" and on the podium
 * like anyone holding a phone, because it *is* a player. See
 * `services/quizwizz/bots.ts` for why they are spaced 200ms apart rather than
 * answering all at once.
 *
 * **Development only.** `import.meta.env.DEV` is false in a build, so this
 * renders nothing and the bot module is never reached — an "add bot" button on a
 * television in front of a room is a mistake waiting for a stray click. Delete
 * the guard below if you need it in `vite preview` or on a deployed staging
 * origin.
 *
 * Deliberately not on the phone side and not in the game zone: it is an operator
 * tool, so it lives with the other operator tools.
 */

interface BotControlProps {
  /** No socket, no join worth attempting. Matches the rest of the remote. */
  connected: boolean;
}

export function BotControl({ connected }: BotControlProps) {
  const { bots, adding, error } = useBots();

  if (!import.meta.env.DEV) return null;

  return (
    <div className="bot-control">
      <div className="bot-control__row">
        <span className="bot-control__label">
          {bots.length === 0 ? 'Test bots' : `${bots.length} bot${bots.length === 1 ? '' : 's'}`}
        </span>

        <div className="bot-control__actions">
          {/* `player:leave`, not a closed socket — the difference between the
              room going back to how you found it and a column of greyed-out
              tiles still holding scores. */}
          {bots.length > 0 && (
            <button
              type="button"
              className="bot-control__btn bot-control__btn--ghost"
              onClick={removeAllBots}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            className="bot-control__btn"
            // `adding` covers the join round trip, so a double-tap is one bot
            // rather than two with the same intent behind them.
            disabled={!connected || adding}
            onClick={() => void addBot()}
          >
            + Add bot
          </button>
        </div>
      </div>

      {/* Who is in, so a tile on the leaderboard can be matched to a bot at a
          glance. Dimmed until the socket is open — joined is not yet playing. */}
      {bots.length > 0 && (
        <div className="bot-control__flock">
          {bots.map(bot => (
            <span
              key={bot.id}
              className={`bot-control__bot${bot.ready ? '' : ' bot-control__bot--waiting'}`}
              title={bot.name}
            >
              <Avatar avatar={bot.avatar} size={20} seed={bot.id} />
            </span>
          ))}
        </div>
      )}

      {/* `session_full`, `no_live_session` — the server's own sentence. */}
      {error && <p className="bot-control__error">{error}</p>}
    </div>
  );
}
