import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { ReactionOption } from '../../services/quizwizz';

/**
 * **One button per option the server sent**, every intermission — the lobby, the
 * podium, and the breaks between games.
 *
 * **Not during a game.** It is the intermission scene that mounts this, and
 * nothing else does: while a game is running the controls belong to the module,
 * and a room mashing 🔥 under a question they are meant to be answering is a
 * distraction the host has no way to switch off. Scoping the bar to the phases
 * where reacting *is* the point makes that a property of the component tree
 * rather than a rule somebody has to remember at each call site.
 *
 * **The bar is `snapshot.reactions`, rendered in order, unfiltered.** It arrives
 * composed — the palette plus this player's own avatar marked `self` — from the
 * same server call that decides what a `player:react` is allowed to carry. This
 * component knows what a button *looks* like and nothing about what may be sent.
 * It used to import `EMOJI_PALETTE` and append the avatar itself, which put the
 * rule in two codebases where only one of them decided anything; the failure
 * when they disagreed was a button that did nothing, because an off-list
 * reaction is dropped without a refusal.
 *
 * So: never add an emoji here, never drop one, and don't sort them.
 *
 * No disabled state and no cooldown: the rate limit is the server's and it drops
 * excess **silently**, because mashing is the point. Every tap gets its pop
 * whether or not that one made it through — which is also the honest thing to
 * show, since the phone genuinely cannot know.
 */
export function ReactionBar({
  options,
  onReact,
}: {
  /** `snapshot.reactions`. Empty before the first snapshot — then there is no bar. */
  options: ReactionOption[];
  onReact: (emoji: string) => void;
}) {
  // Which button is mid-pop, and a counter to restart the animation on a repeat
  // tap of the same one. Re-tapping is the common case, so the key has to change
  // even when the emoji doesn't.
  const [popped, setPopped] = useState<{ emoji: string; n: number } | null>(null);

  // Nothing to draw yet. An empty strip is better than a row of dead buttons,
  // and this lasts exactly as long as the gap before the first snapshot.
  if (options.length === 0) return null;

  return (
    // The column count comes from the list, not from a number typed twice: the
    // palette is re-themed by editing `config.ts` on the server, and a player
    // whose avatar can't be sent gets one column fewer. A grid that assumed a
    // count would strand the difference across half the bar.
    <div
      className="reaction-bar"
      style={{ '--reaction-count': options.length } as CSSProperties}
    >
      {options.map(({ emoji, kind }) => (
        <button
          key={`${emoji}-${popped?.emoji === emoji ? popped.n : 0}`}
          type="button"
          aria-label={kind === 'self' ? 'React with your avatar' : `React ${emoji}`}
          className={
            'reaction-bar__button' +
            (kind === 'self' ? ' reaction-bar__button--mine' : '') +
            (popped?.emoji === emoji ? ' reaction-bar__button--popped' : '')
          }
          onClick={() => {
            setPopped(current => ({ emoji, n: (current?.n ?? 0) + 1 }));
            onReact(emoji);
          }}
        >
          <span aria-hidden="true">{emoji}</span>
        </button>
      ))}
    </div>
  );
}
