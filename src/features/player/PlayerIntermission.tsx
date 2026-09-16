import { useMemo, useState } from 'react';
import { EmojiStream } from '../../components/EmojiStream';
import type { EmojiFeed } from '../../components/EmojiStream';
import { Leaderboard } from '../../components/Leaderboard';
import { ReactionBar } from '../../components/player/ReactionBar';
import { SelfStanding } from '../../components/player/SelfStanding';
import { byRank } from '../../components/standings';
import type { GameRef, Phase, PublicPlayer, ReactionOption } from '../../services/quizwizz';

/**
 * **Everything that isn't a game.** `LOBBY`, `RESULTS` and `FINAL` — the three
 * phases the engine owns — on one layout, because the phone is doing the same
 * job in each: show where everybody stands, and let people shout.
 *
 * Splitting these into a lobby screen and a final screen was the wrong seam. It
 * produced two components rendering the same list under different headings, and
 * it would have produced a third the moment a playlist had two games in it.
 *
 * **The reaction bar lives here and only here.** During a game the controls
 * belong to the module and eight people mashing 🔥 under a question is a
 * distraction nobody can switch off. Scoping the bar to the phases where
 * reacting is the point makes "no reactions during play" a fact of the component
 * tree rather than a rule to remember.
 *
 * What is *in* that bar is the server's business, not this scene's: `reactions`
 * arrives on the snapshot already composed and goes straight through.
 *
 * **And no scorecard.** The table of how the game just went belongs to the
 * television and is host-only on purpose — `components/host/Scorecard.tsx`. A
 * phone gets the standings and its own line in them, which is the one thing a
 * screen three metres away cannot do well; a 430px strip spent on a table that
 * is already up there, larger, is a strip spent repeating it. `scorecard` is on
 * the wire for every client, so this is a rendering decision — it is made here,
 * and it is made once.
 *
 * No podium and no confetti. The television is doing the celebrating, and a
 * phone competing with it splits the room's attention at the one moment it was
 * all pointed the same way. What the phone offers instead is the thing the TV
 * can't — scrolling back to find your own name at your own pace, which is also
 * why this list never auto-scrolls.
 */

interface PlayerIntermissionProps {
  phase: Phase | null;
  players: PublicPlayer[];
  /**
   * `snapshot.you.playerId`, used to pick your own row out of `players` for the
   * card above the list. Null until the first snapshot lands, and on the beat
   * where the roster has not caught up with it — both render as no card, which
   * is why this is an id rather than a row: the score and the rank have to come
   * out of the same roster the list below is drawn from, or the card and your
   * line in the list could say two different numbers.
   */
  youId: string | null;
  /** `snapshot.reactions`, straight through to the bar. Not assembled here. */
  reactions: ReactionOption[];
  /** What `RESULTS` announces. Null means the podium is next. */
  upNext: GameRef | null;
  onReact: (emoji: string) => void;
  /** Offered at `FINAL` only — the one intermission with nothing after it. */
  onLeave: () => void;
}

/**
 * What the room is waiting for. `null` is the beat before the first snapshot
 * lands, which reads as the lobby because that is where it almost always is.
 *
 * The note is optional, and the lobby is the phase that goes without one. It had
 * a greeting and an instruction, and both were wrong: the header already says
 * who you are, and a phone telling fifteen people in one room to look at the
 * television they are already looking at is a line nobody reads twice. What is
 * under it is the standings, so the heading says so and gets out of the way.
 */
function headingFor(phase: Phase | null, upNext: GameRef | null): { title: string; note?: string } {
  if (phase === 'FINAL') return { title: 'Game over', note: 'Thanks for playing!' };
  if (phase === 'RESULTS') {
    return {
      title: 'Scores are in',
      // `upNext: null` is the server saying the playlist is finished. Saying so
      // is what stops the room asking whether the game is broken or over.
      note: upNext ? `Next up — ${upNext.title}` : 'Final standings coming up…',
    };
  }
  return { title: 'Leaderboard' };
}

export function PlayerIntermission({
  phase,
  players,
  youId,
  reactions,
  upNext,
  onReact,
  onLeave,
}: PlayerIntermissionProps) {
  const ranked = useMemo(() => byRank(players), [players]);
  const me = useMemo(() => players.find(p => p.id === youId) ?? null, [players, youId]);
  const { title, note } = headingFor(phase, upNext);

  // Medals and movement are both withheld in the lobby, exactly as they are on
  // the television: every score is zero there, so the order is join order, and a
  // gold row on whoever scanned first is a podium for a game nobody has played.
  const played = phase !== null && phase !== 'LOBBY';

  /**
   * Local pops, not the server's burst.
   *
   * A phone shows its *own* taps immediately — the round trip through
   * `react:burst` is 100ms of batching plus the network, and a button that waits
   * that long to answer feels broken. The server's bursts go to the television,
   * which is where they mean something: they are the room's reaction, not yours.
   */
  const [feed, setFeed] = useState<EmojiFeed | null>(null);

  return (
    <div className="player-intermission">
      {/* The stage stops at the bar's top edge, which is what makes a reaction
          rise out from *behind* the buttons rather than appear on top of them,
          and stop before it reaches your own name. */}
      <div className="player-intermission__stage">
        <EmojiStream feed={feed} variant="overlay" />

        <div className="player-intermission__body">
          {/* Heading and leave button are pinned; the list between them is the
              only thing that moves. Scrolling a phone full of names should never
              carry off the label that says what the names are. */}
          <div className="player-intermission__heading">
            <p className="player-intermission__title">{title}</p>
            {note && <p className="subtle text-sm">{note}</p>}
          </div>

          {/* Pinned, like the heading. The whole point of this card is that you
              never have to go looking for your own score — one that scrolls away
              with the list is one you have to go looking for. */}
          {me && <SelfStanding me={me} medals={played} movement={played} />}

          {ranked.length === 0 ? (
            <p className="subtle text-sm">Nobody else yet.</p>
          ) : (
            <Leaderboard rows={ranked} size="sm" medals={played} movement={played} />
          )}

          {/* FINAL is terminal — the server answers `next` from here with FINAL,
              so there is no game to wait for. Without this the phone holds a
              pass to a finished game and only a reload gets it into the next. */}
          {phase === 'FINAL' && (
            <button type="button" className="player-intermission__leave" onClick={onLeave}>
              Join a new game
            </button>
          )}
        </div>
      </div>

      <ReactionBar
        options={reactions}
        onReact={emoji => {
          onReact(emoji);
          setFeed(current => ({ seq: (current?.seq ?? 0) + 1, emojis: [emoji] }));
        }}
      />
    </div>
  );
}
