import { useState, useEffect } from 'react';
import { Modal } from '../../../primitives/Modal';
import StudioHome from './studio/StudioHome';
import AlbumCreator from './studio/AlbumCreator';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The artist every tool in here acts on. */
  artistId: string;
}

/**
 * The creator studio: everything an owner makes, behind one door.
 *
 * This file is the shell and nothing else — the modal, the frame each tool is
 * laid out in, the way back, and which tool is open. **The tools themselves live
 * in `studio/`, one file each**, and own their own state, hooks and busy UI.
 * Adding a tool is a page id, a title, and a line in the switch below; it costs
 * this file nothing else, which is the point of the split.
 *
 * One modal with pages rather than a modal per tool, because "what am I making"
 * and "make it" are one decision the owner can back out of halfway.
 */

/** Which tool is open. `home` is the menu. */
export type StudioPage = 'home' | 'album';

/**
 * The heading each page wears, and the modal's accessible name while it's up.
 * Owned here so a page can't disagree with the header above it.
 */
const TITLES: Record<StudioPage, string> = {
  home: 'Creator Studio',
  album: 'Album Creator',
};

export default function CreatorStudio({ open, onClose, artistId }: Props) {
  const [page, setPage] = useState<StudioPage>('home');

  // Reset on the way *in*, not on the way out: the box animates closed over
  // 250ms and still shows its content, so clearing at close would flash the menu
  // over the tool the owner just left.
  useEffect(() => {
    if (open) setPage('home');
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={TITLES[page]}>
      {/* The one scroll container, so a tool can be as tall as it likes and
          never has to arrange its own scrolling. */}
      <div className="flex flex-col gap-lg overflow-y-auto p-xl">
        {/* The way back is the shell's job, not each tool's, so every page gets
            it in the same place for free. */}
        {page !== 'home' && <StudioHeader title={TITLES[page]} onBack={() => setPage('home')} />}

        {page === 'home' && <StudioHome onOpen={setPage} />}
        {page === 'album' && <AlbumCreator artistId={artistId} onDone={onClose} />}
      </div>
    </Modal>
  );
}

// Title and the way out of a tool, back to the menu.
function StudioHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-sm">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to the studio menu"
        className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-surface-2
                   p-0 text-white active:opacity-70 transition-opacity"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>
      <h2 className="font-display text-lg uppercase tracking-wide">{title}</h2>
    </div>
  );
}
