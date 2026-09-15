import { useState } from 'react';
import { EMOJI_PALETTE } from '../services/quizwizz';

/**
 * Eight buttons, every phase, including the lobby and the podium.
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
    <div className="reaction-bar">
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
