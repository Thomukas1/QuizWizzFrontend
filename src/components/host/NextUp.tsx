import { useEffect, useState } from 'react';
import { ArmedButton } from '../../primitives/ArmedButton';
import type { GameRef, GameRun, HostCommand, Phase } from '../../services/quizwizz';

/**
 * **What happens when you press the key.** One control at the bottom of the
 * remote: the name of the thing coming next, and the two ways to reach it.
 *
 * It replaced a playlist picker and a pair of unlabelled transport buttons. Both
 * were answering the same question — *what does Space do right now* — and
 * answering it in three places meant none of them said it outright. So the
 * control names the destination and the button is the verb.
 *
 * **The phase decides all of it**, which is the only branch there is to make:
 *
 * | Phase | Names | Go | Skip |
 * |---|---|---|---|
 * | `LOBBY` | the first game of the playlist | starts it | — |
 * | `GAME` | the game running | the next step of it | force-ends it |
 * | `RESULTS` | `upNext`, or the podium when it's null | starts it | — |
 * | `FINAL` | nothing | — | — |
 *
 * Skip appears during `GAME` alone, and that is the server's rule rather than a
 * layout preference: `skipGame` is refused `wrong_phase` everywhere else, and a
 * button whose only outcome is a toast is worse than no button.
 */

/**
 * **The evening, in order.** Ids must match the *server's* registry — an id it
 * doesn't know is refused `unknown_game` when the playlist is set, which is the
 * whole reason `setPlaylist` is lobby-only: a typo surfaces minutes before the
 * party rather than in front of it.
 *
 * **This list is the only reason a second game happens.** `createSession` takes
 * no playlist, so the server starts empty and `RESULTS.next` reads
 * `gameIndex + 1 < playlist.length ? 'GAME' : 'FINAL'` — one entry here and the
 * evening goes straight from the first game to the podium, which is not the
 * server having an opinion about the order. Adding a format to the registry and
 * forgetting this row is the way that looks like a bug.
 *
 * A list rather than a picker because the order is a decision made before the
 * party, not during it. When there are enough formats that the order is worth
 * choosing on the night, this is still the playlist and the lobby still
 * announces its first entry — the picker is a control that can be added then.
 *
 * `config` is per entry and optional: everything has a default on the server,
 * so an entry names a key only to *differ* from it. Speedrun's are in
 * `_DOCS/quizzes/02-speedrun.md` — `winners`, `pointsEach`, `revealMode`,
 * `revealStepMs`.
 */
const PLAYLIST: { gameId: string; title: string; config?: Record<string, unknown> }[] = [
  // { gameId: 'quiz-warmup', title: 'Warmup' },
  // { gameId: 'quiz-speedrun', title: 'Speedrun' },
  /**
   * The content id is the server's own default, named here because it is this
   * entry's handle: an evening's three Match-3 rounds are three of these rows
   * with three `content` files, and a run-through that doesn't want a hundred
   * seconds of barrage swaps in a short one **here** rather than fighting
   * `FAST_CONFIG` — an entry's own config goes over the dev override, so this is
   * the key that always wins.
   */
  { gameId: 'quiz-match3', title: 'Match-3', config: { content: 'match3-01' } },
  /**
   * The recovery round, and the one to end on. It is the slowest format in the
   * set — two questions per item — so four to six items is a round, and the
   * content file's own length is the lever rather than anything here.
   */
  { gameId: 'quiz-popularity', title: 'Popularity', config: { content: 'popularity-01' } },
];

/**
 * **Dev only: `/host?fast` shortens every clock in the playlist entry.**
 *
 * Walking ten warmup questions end to end at the real pace is five minutes of
 * sitting still, which is enough friction that a run-through doesn't get done.
 * The keys are the server module's own config — the engine merges a playlist
 * entry over `defaultConfig`, so naming a subset here overrides exactly those
 * and leaves `content` and `pointsCorrect` where they belong.
 *
 * Off unless the flag is in the URL, so the shipped path still sends `{}` and
 * the server stays the only place the real timings are written down.
 */
const FAST_CONFIG: Record<string, unknown> = {
  introMs: 1_000,
  itemDurationMs: 5_000,
  lastChanceBufferMs: 1_000,
  lockPauseMs: 300,
  /**
   * Match-3's running start, which nothing else has. Worth knowing when you
   * reach for `?fast` on this one: `itemDurationMs` is per item and Match-3 has
   * twenty of them, so the flag still leaves a hundred seconds of barrage to sit
   * through. A short content file in the playlist row above is the real lever.
   */
  countdownMs: 1_000,
  /**
   * Popularity's two questions, which are separate keys because the asymmetry
   * between them is the format: ten seconds of gut reaction, twice that to think
   * about the room. A module only reads the keys it knows, so naming them here
   * costs the other three formats nothing.
   */
  opinionDurationMs: 4_000,
  predictionDurationMs: 5_000,
  switchMs: 600,
  /** The chart. Short enough to get through, long enough to still be a reveal. */
  barGrowthMs: 700,
};

const configForPlaylist = (): Record<string, unknown> =>
  new URLSearchParams(window.location.search).has('fast') ? FAST_CONFIG : {};

/**
 * How long to wait for the playlist to land before handing the button back.
 *
 * It arrives as a phase broadcast on the same socket, so this is a failsafe
 * rather than a timeout anyone should ever see — and the thing it protects
 * against is a refused playlist leaving the button stuck saying "Starting…"
 * with no way to press it again.
 */
const ARM_TIMEOUT_MS = 2_500;

interface NextUpProps {
  phase: Phase | null;
  /** The game running, or the one that just did. */
  game: GameRun | null;
  /** The server's own "what's next". Null means the next stop is the podium. */
  upNext: GameRef | null;
  /** How many games are loaded. Zero is why Space would otherwise end the evening. */
  gameCount: number;
  command: (cmd: HostCommand, args?: Record<string, unknown>) => void;
  connected: boolean;
}

export function NextUp({ phase, game, upNext, gameCount, command, connected }: NextUpProps) {
  /**
   * A press waiting on the playlist it just sent.
   *
   * `engine.createSession()` takes no argument, so a fresh session's playlist is
   * empty and `LOBBY.next` reads `playlist.length ? 'GAME' : 'FINAL'` — one key
   * in an empty lobby ends the evening on a podium nobody played for.
   *
   * Sending `setPlaylist` and `next` together would fix the ordinary case and
   * keep exactly that failure for the one that matters: a refused playlist
   * leaves `next` reading an empty one, and the room watches the game jump
   * straight to the scores. So the press arms instead, and the `next` goes only
   * once the server has said the playlist is there.
   */
  const [arming, setArming] = useState(false);

  useEffect(() => {
    if (!arming) return;

    // It landed. `gameCount` comes off the phase broadcast `setPlaylist` sends,
    // so this is the server's confirmation rather than an assumption about it.
    if (gameCount > 0 && phase === 'LOBBY') {
      setArming(false);
      command('next');
      return;
    }

    // Refused, or we left the lobby some other way. Either way the press is
    // spent and the button comes back — a refusal has already raised its toast.
    const id = setTimeout(() => setArming(false), ARM_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [arming, gameCount, phase, command]);

  const playing = phase === 'GAME';
  const over = phase === 'FINAL';

  /**
   * What the control names, and it is the *destination* in every phase but one.
   * During a game the destination is another step of the same game, which is
   * not a thing worth naming — so it names what is on instead.
   */
  const { eyebrow, title } = over
    ? { eyebrow: "That's the lot", title: 'Game over' }
    : playing
      ? { eyebrow: 'Now playing', title: game?.title ?? 'This round' }
      : {
          eyebrow: 'Next up',
          // In the lobby before anything is loaded the server has no opinion
          // yet, so this is the host's: the first entry of the playlist Go is
          // about to send. `upNext` takes over the moment it lands, and from
          // `RESULTS` onwards it is the only source — including its null, which
          // is the server saying the playlist is finished.
          title: upNext?.title ?? (phase === 'LOBBY' ? PLAYLIST[0]?.title : null) ?? 'Final scores',
        };

  const go = () => {
    if (gameCount === 0 && phase === 'LOBBY') {
      setArming(true);
      // Empty config unless `?fast` is set: every key has a default on the
      // server, the content id included. Naming one here would be a second copy
      // of something only the server can resolve.
      // The dev override goes *under* an entry's own config, not over it: `?fast`
      // is there to get through a run-through, and a game that had to name a key
      // to differ from the server's default meant it.
      const fast = configForPlaylist();
      command('setPlaylist', {
        playlist: PLAYLIST.map(entry => ({
          gameId: entry.gameId,
          config: { ...fast, ...entry.config },
        })),
      });
      return;
    }
    command('next');
  };

  return (
    <div className="next-up">
      <div className="next-up__billing">
        <span className="eyebrow">{eyebrow}</span>
        <span className="next-up__title">{title}</span>
      </div>

      <div className="next-up__actions">
        {/*
          The escape hatch, and the reason an unclaimed `next` during GAME can
          safely be refused: `skipGame` force-ends the running game with no
          awards without consulting the module, so a format that has hung — or
          one nobody wants to sit through — can't hold the evening hostage.

          Armed, because it silently costs everyone the points they were playing
          for. Gone outside `GAME`, where the server refuses it anyway.
        */}
        {playing && (
          <ArmedButton
            className="admin-btn admin-btn--ghost"
            armedClassName="admin-btn--armed"
            disabled={!connected}
            title="End the running game with no points awarded"
            label="Skip ↦"
            confirmLabel="Tap to skip"
            onConfirm={() => command('skipGame')}
          />
        )}

        {/* Space sends the same `next` and stays the primary control. This is
            what you reach for when the room is watching and you'd rather not
            look like you're typing. */}
        <button
          type="button"
          className="admin-btn admin-btn--next"
          disabled={!connected || over || arming}
          onClick={go}
        >
          {arming ? 'Starting…' : 'Go →'}
        </button>
      </div>
    </div>
  );
}
