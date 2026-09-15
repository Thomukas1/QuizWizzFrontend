import { useState } from 'react';
import { Countdown } from '../../primitives/Countdown';
import type { Draft } from '../../services/slopbop';

interface Props {
  draft: Draft;
  /** Whether this card's actions are showing. The studio holds this, so only one is ever open. */
  open: boolean;
  onToggle: () => void;
  /** Uploads to Arweave and moves it to the gallery. */
  onSave: () => Promise<unknown>;
  /** Orders the same prompt again. This draft dies in the process. */
  onReroll: () => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  /** The draft's 24h is up. A refetch drops it, since the server has swept it. */
  onExpire: () => void;
  /** Another upload is running — the hook takes one at a time. */
  saveDisabled?: boolean;
  /** A render is already queued — the studio takes one at a time. */
  rerollDisabled?: boolean;
}

/**
 * One draft, and the three things you can do with it.
 *
 * The actions live *on* the image rather than in a row beneath it: a column of
 * drafts is already tall, and three buttons per card would push the next one off
 * the screen. Tapping the image raises a scrim over it and the buttons on top;
 * tapping anywhere that isn't a button puts it back.
 *
 * All three are one-way — save uploads, reroll replaces, delete is delete — so
 * none of them fire from the closed state. Opening the card first is the
 * confirmation step.
 */
export default function DraftCard({
  draft,
  open,
  onToggle,
  onSave,
  onReroll,
  onDelete,
  onExpire,
  saveDisabled,
  rerollDisabled,
}: Props) {
  const [acting, setActing] = useState(false);

  // Every action that succeeds takes this card off the list — saved drafts move
  // to the gallery, rerolled and deleted ones are gone — so `acting` only ever
  // resolves back to false on a failure, which is exactly when the buttons
  // should come back for another go.
  const run = (action: () => Promise<unknown>) => async () => {
    setActing(true);
    try {
      await action();
    } finally {
      setActing(false);
    }
  };

  return (
    <figure className="flex flex-col gap-xs">
      <div className="relative w-full aspect-square overflow-hidden rounded-md border-sm border-border">
        {/* The image is the toggle, at full size, underneath everything. Both
            opening and closing are the same press on the same target. */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? 'Hide draft actions' : 'Show draft actions'}
          className="absolute inset-0 block w-full h-full p-0 rounded-none bg-transparent"
        >
          <img src={draft.image_data} alt={draft.prompt} className="w-full h-full object-cover" />
        </button>

        {/* How long is left of this draft's 24 hours. A tab notched into the
            corner rather than a row of its own: it's a fact about the picture,
            and the picture is the thing being looked at. Red, because the number
            it's showing is a deadline — this draft is gone when it runs out
            unless it's saved. No label; a clock counting down in that colour
            isn't offering anything else.

            Under the scrim, so opening the card dims it with everything else,
            and click-through, so pressing the corner still toggles the card. */}
        {draft.expires_at && (
          <div
            className="pointer-events-none absolute top-0 right-0 rounded-bl-md bg-danger
                       px-sm py-xs text-xs font-medium leading-none text-white"
          >
            <Countdown target={draft.expires_at} onExpire={onExpire} render={left => left} />
          </div>
        )}

        {/* Scrim and actions. The layer itself takes no clicks, so a press on the
            darkened image falls through to the toggle beneath and closes it —
            only the buttons catch. `inert` keeps them off the tab order and out
            of the screen reader while the card is shut, which opacity alone
            wouldn't. */}
        <div
          inert={!open}
          className={`absolute inset-0 flex flex-col items-center justify-center gap-sm
                      bg-black/80 pointer-events-none transition-opacity duration-base
                      ${open ? 'opacity-100' : 'opacity-0'}`}
        >
          {acting ? (
            <div className="spinner large processing" />
          ) : (
            <>
              <DraftAction emoji="💾" label="Save" onClick={run(onSave)} disabled={saveDisabled} />
              <DraftAction emoji="🎲" label="Reroll" onClick={run(onReroll)} disabled={rerollDisabled} />
              <DraftAction emoji="❌" label="Delete" onClick={run(onDelete)} />
            </>
          )}
        </div>
      </div>

      <figcaption className="text-xs text-muted leading-relaxed">{draft.prompt}</figcaption>
    </figure>
  );
}

// `pointer-events-auto` is what makes this a hole in the scrim above.
function DraftAction({
  emoji,
  label,
  onClick,
  disabled,
}: {
  emoji: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="pointer-events-auto flex items-center gap-sm w-36 rounded-md border-xs
                 border-white/20 bg-white/10 px-md py-sm text-sm text-white
                 enabled:hover:bg-white/20 enabled:active:scale-[0.98]"
    >
      <span aria-hidden="true">{emoji}</span>
      {label}
    </button>
  );
}
