import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../primitives/Modal';
import Img from '../../primitives/Img';
import type { SavedImage } from '../../services/slopbop';
import { fetchArweave } from '../../services/arweave';

interface Props {
  /** The image being looked at, or null when nothing is. */
  image: SavedImage | null;
  onClose: () => void;
  /** Drops the record. Resolves false if the server refused. */
  onDelete: (imageId: string) => Promise<boolean>;
}

/**
 * One saved image, big, over a darkened page: the picture, the prompt that made
 * it, and the two things to do with it.
 *
 * Download and delete sit at opposite ends on purpose — the delete is a small
 * target in the corner and the download is the full-width button under the
 * prompt, so the destructive one is never next to the one you actually came for.
 *
 * Delete drops the record only. The bytes are on Arweave and stay there forever,
 * as does any url already handed out, so this hides an image rather than
 * unpublishing it.
 */
export default function ImageViewer({ image, onClose, onDelete }: Props) {
  // What to draw. `image` goes null the instant it's dismissed, but the modal
  // animates out over 250ms and would show an empty box for it.
  const [shown, setShown] = useState(image);
  useEffect(() => {
    if (image) setShown(image);
  }, [image]);

  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Pull the file cross-origin (the gateway allows it) and hand over a real
  // download with a sensible name, rather than navigating to it — the same
  // treatment songs get. Falls back to opening the url if the fetch is blocked.
  const handleDownload = useCallback(async () => {
    if (!shown || downloading) return;
    setDownloading(true);
    try {
      const res = await fetchArweave(shown.url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = safeFilename(shown.prompt, blob.type);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(shown.url, '_blank', 'noopener');
    } finally {
      setDownloading(false);
    }
  }, [shown, downloading]);

  const handleDelete = useCallback(async () => {
    if (!shown || deleting) return;
    setDeleting(true);
    const ok = await onDelete(shown.image_id);
    setDeleting(false);
    // On failure the reason is already toasted; stay open so it can be retried.
    if (ok) onClose();
  }, [shown, deleting, onDelete, onClose]);

  if (!shown) return null;

  return (
    <Modal open={!!image} onClose={onClose} title="Saved image">
      <div className="flex flex-col gap-md overflow-y-auto p-lg">
        <div className="relative overflow-hidden rounded-md border-sm border-border">
          <Img src={shown.url} alt={shown.prompt} className="w-full aspect-square" />

          {/* Notched into the corner, and the only red on the page. Alone up
              here by design: nothing else is within a thumb's slip of it. */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Delete this image"
            className="absolute top-0 right-0 flex items-center justify-center w-10 h-10 p-0
                       rounded-none rounded-bl-md bg-danger text-white
                       active:opacity-70 transition-opacity disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-muted leading-relaxed">{shown.prompt}</p>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          // `inline-flex` because the base button style sets `align-items` and
          // `gap` but never a flex display — the icon would sit on the baseline.
          className="special full-width inline-flex items-center justify-center gap-sm"
        >
          {downloading ? (
            'Downloading…'
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              Download
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}

// The prompt is the only name an image has, and it can be 300 characters of it.
// The extension comes from what actually downloaded rather than a guess.
function safeFilename(prompt: string, mime: string): string {
  const name = prompt.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 48);
  const ext = mime.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'png';
  return `${name || 'visual'}.${ext}`;
}
