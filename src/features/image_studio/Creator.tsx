import { useState } from 'react';
import { TextAreaField } from '../../primitives/form';
import { useToast } from '../../context/ToastContext';
import { MAX_VISUAL_PROMPT } from '../../services/slopbop';
import type { ImageStudio } from '../../hooks/visuals';
import DraftCard from './DraftCard';

interface Props {
  studio: ImageStudio;
}

/**
 * Making one: a prompt, and everything it has rendered that hasn't been kept or
 * thrown away yet. What you can do to a draft lives on the draft, in `DraftCard`.
 *
 * The studio is one GPU shared with songs and videos, so a render waits its turn
 * — seconds usually, minutes when it's behind something. Leaving the page only
 * stops the watching; the order is placed and the draft will be here on return.
 */
export default function Creator({ studio }: Props) {
  const { drafts, draftsLoading, generating, saving, create, reroll, save, discard, refetch } =
    studio;
  const { showToast } = useToast();
  const [prompt, setPrompt] = useState('');

  // Which draft has its actions up. Held here rather than per-card, because
  // opening one has to shut the last one.
  const [openDraftId, setOpenDraftId] = useState<string | null>(null);

  // Kept, not cleared, on a successful order: the next prompt is nearly always
  // this one with a word changed.
  const handleCreate = () => create(prompt.trim());

  // The draft simply leaves the list on success, and the gallery it moves to is
  // the other tab — so say where it went.
  const handleSave = async (imageId: string) => {
    const url = await save(imageId);
    if (url) showToast('Saved to your gallery.', 'success');
  };

  return (
    <>
      <div className="flex flex-col gap-md">
        <TextAreaField
          label="Prompt"
          value={prompt}
          onChange={setPrompt}
          maxLength={MAX_VISUAL_PROMPT}
          rows={4}
          placeholder="Describe the shot — where they are, what they're wearing, how it's lit."
          help={`${prompt.length}/${MAX_VISUAL_PROMPT}`}
        />

        {/* The button is *replaced* rather than disabled: there's nothing to
            press while the studio is busy, and the space it leaves is where the
            answer to "is it still coming?" belongs. The prompt stays editable —
            the next one is usually written during the wait. */}
        {generating ? (
          <div
            className="flex items-center justify-center gap-md min-h-[48px] rounded-md
                       border-sm border-border bg-surface-2 px-lg py-md"
          >
            <div className="spinner small processing" />
            <span className="text-sm text-muted">Generation in progress…</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={!prompt.trim()}
            className="special full-width"
          >
            Create
          </button>
        )}
      </div>

      <div className="flex flex-col gap-md">
        <h2 className="font-display text-sm uppercase tracking-wide">Drafts</h2>

        {drafts.length === 0 && (
          draftsLoading ? (
            <div className="spinner large processing" />
          ) : (
            <p className="text-xs text-muted leading-relaxed">
              Nothing yet. Describe a shot above and your artist gets rendered into it.
            </p>
          )
        )}

        {drafts.map(draft => (
          <DraftCard
            key={draft.image_id}
            draft={draft}
            open={openDraftId === draft.image_id}
            onToggle={() =>
              setOpenDraftId(current => (current === draft.image_id ? null : draft.image_id))
            }
            onSave={() => handleSave(draft.image_id)}
            onReroll={() => reroll(draft.image_id)}
            onDelete={() => discard(draft.image_id)}
            onExpire={refetch}
            // Both refuse re-entry inside the hook; disabling says so up front
            // rather than letting a press do nothing. Delete has no such queue,
            // so it stays live throughout.
            saveDisabled={saving}
            rerollDisabled={generating}
          />
        ))}
      </div>
    </>
  );
}
