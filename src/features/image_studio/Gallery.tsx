import { useState } from 'react';
import Img from '../../primitives/Img';
import type { SavedImage } from '../../services/slopbop';
import ImageViewer from './ImageViewer';

interface Props {
  images: SavedImage[];
  loading: boolean;
  /** Drops the record. Arweave keeps the bytes regardless. */
  onDelete: (imageId: string) => Promise<boolean>;
}

/**
 * Everything the owner kept: the drafts that were saved, which are on Arweave
 * and no longer expire.
 *
 * Two to a row rather than one like the drafts. A draft is being judged — is
 * this the one? — and wants the width; the gallery is being browsed, and what
 * matters is how much of it you can see at once. It's also the pile that has to
 * grow into something worth re-training the artist's LoRA on.
 *
 * The tiles are for finding one. Everything you do *to* an image happens in
 * `ImageViewer`, at a size where you can see what you're deciding about.
 *
 * `Img` lazy-loads them: these are real downloads, unlike a draft's inline
 * bytes, and a long gallery shouldn't fetch what's below the fold.
 */
export default function Gallery({ images, loading, onDelete }: Props) {
  const [selected, setSelected] = useState<SavedImage | null>(null);

  if (images.length === 0) {
    return loading ? (
      <div className="spinner large processing" />
    ) : (
      <p className="text-xs text-muted leading-relaxed">
        Nothing here yet. Renders you keep land in the gallery — and stay there.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-sm">
        {images.map(image => (
          <button
            key={image.image_id}
            type="button"
            onClick={() => setSelected(image)}
            aria-label={`Open image: ${image.prompt}`}
            className="block w-full p-0 rounded-md bg-transparent active:opacity-70 transition-opacity"
          >
            <Img
              src={image.url}
              alt={image.prompt}
              className="w-full aspect-square rounded-md border-sm border-border"
            />
          </button>
        ))}
      </div>

      {/* Portals to the body, so it isn't laid out inside the grid. */}
      <ImageViewer
        image={selected}
        onClose={() => setSelected(null)}
        onDelete={onDelete}
      />
    </>
  );
}
