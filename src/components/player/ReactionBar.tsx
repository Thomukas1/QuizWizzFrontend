import { useState } from 'react';
import type { CSSProperties } from 'react';
import { EMOJI_PALETTE } from '../../services/quizwizz';

/**
 * One button per palette entry, every intermission — the lobby, the podium, and
 * the breaks between games.
 *
 * **Not during a game.** It is the intermission scene that mounts this, and
 * nothing else does: while a game is running the controls belong to the module,
 * and a room mashing 🔥 under a question they are meant to be answering is a
 * distraction the host has no way to switch off. Scoping the bar to the phases
 * where reacting *is* the point makes that a property of the component tree
 * rather than a rule somebody has to remember at each call site.
 *
 * The palette comes from the copied `config.ts` and is deliberately disjoint
 * from `AVATAR_EMOJI`, so a reaction floating up the screen never looks like
 * somebody's face. Don't transcribe it.
 *
 * No disabled state and no cooldown: the rate limit is the server's and it drops
 * excess **silently**, because mashing is the point. Every tap gets its pop
 * whether or not that one made it through — which is also the honest thing to
 * show, since the phone genuinely cannot know.
 */
export function ReactionBar({ onReact }: { onReact: (emoji: string) => void }) {
  // Which button is mid-pop, and a counter to restart the animation on a repeat
  // tap of the same one. Re-tapping is the common case, so the key has to change
  // even when the emoji doesn't.
  const [popped, setPopped] = useState<{ emoji: string; n: number } | null>(null);

  return (
    // The column count comes from the palette, not from a number typed twice.
    // `config.ts` is re-themed by editing that list, and a grid that assumed
    // eight left four buttons stranded across half the bar the moment it did.
    <div
      className="reaction-bar"
      style={{ '--reaction-count': EMOJI_PALETTE.length } as CSSProperties}
    >
      {EMOJI_PALETTE.map(emoji => (
        <button
          key={`${emoji}-${popped?.emoji === emoji ? popped.n : 0}`}
          type="button"
          aria-label={`React ${emoji}`}
          className={
            'reaction-bar__button' +
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
