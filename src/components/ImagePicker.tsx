import { Modal } from '../primitives/Modal';
import Img from '../primitives/Img';
import { useSavedImages } from '../hooks/visuals';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Whose gallery to choose from. Owner-gated server-side, so only owner UI should open this. */
  artistId: string;
  /**
   * Hand back the chosen image's permanent url. The picker closes itself
   * afterwards — picking is the whole reason it's up.
   */
  onPick: (url: string) => void;
  /** The url already in place, so the current one reads as chosen rather than just present. */
  selectedUrl?: string;
  /** Heading and accessible name. Defaults to the generic one. */
  title?: string;
}

/**
 * Choose one of an artist's kept images. A modal over a grid: tap a tile and it
 * closes, handing the url up.
 *
 * Shared rather than owned by the profile editor because "point something at one
 * of this artist's images" isn't a profile idea — a cover, a banner and a
 * thumbnail all want exactly this, and the gallery is the app's one pool of
 * pictures. It reads that list itself, so a caller supplies an artist and gets a
 * url back and never has to touch the images API.
 *
 * Deliberately *not* the image studio's `Gallery`: those tiles open a viewer with
 * a delete in it, which is the wrong thing to put in front of someone who came
 * here to pick. This one only picks.
 */
export default function ImagePicker({
  open,
  onClose,
  artistId,
  onPick,
  selectedUrl,
  title = 'Choose an image',
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-lg overflow-y-auto p-xl">
        <h2 className="font-display text-lg uppercase tracking-wide">{title}</h2>
        <PickerGrid artistId={artistId} selectedUrl={selectedUrl} onPick={onPick} />
      </div>
    </Modal>
  );
}

// The grid is a child of `Modal`, which renders nothing while closed — so the
// gallery is read when the picker opens rather than by every caller that merely
// *has* one mounted with `open={false}`. Putting the hook in the component above
// would fetch an owner's whole gallery just for rendering the form behind it.
function PickerGrid({
  artistId,
  selectedUrl,
  onPick,
}: Pick<Props, 'artistId' | 'selectedUrl' | 'onPick'>) {
  const { images, loading } = useSavedImages(artistId);

  if (loading) return <div className="spinner large processing" />;

  if (images.length === 0) {
    return (
      <p className="text-xs text-muted leading-relaxed">
        No saved images yet. Render one in the image studio and keep it — anything
        saved there can be used here.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-sm">
      {images.map(image => (
        <button
          key={image.image_id}
          type="button"
          onClick={() => onPick(image.url)}
          aria-label={`Use this image: ${image.prompt}`}
          aria-pressed={image.url === selectedUrl}
          className="block w-full p-0 rounded-md bg-transparent active:opacity-70 transition-opacity"
        >
          <Img
            src={image.url}
            alt={image.prompt}
            className={`w-full aspect-square rounded-md border-sm ${
              image.url === selectedUrl ? 'border-accent' : 'border-border'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
