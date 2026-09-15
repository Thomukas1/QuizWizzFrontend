import { Modal } from '../../../primitives/Modal';
import { Artist, Location } from '../../../services/slopbop';

// One artist at a location: a compact clickable strip — icon on the left,
// name beside it — that opens their bottom sheet.
function ArtistStrip({ artist, onClick }: { artist: Artist; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-md rounded-xl bg-surface-2 border border-border p-sm active:opacity-70 transition-opacity"
    >
      <img
        src={artist.image_url ?? '/Images/mystery-actor.png'}
        alt={artist.name}
        className="w-10 h-10 rounded-full object-cover object-top shrink-0"
      />
      <span className="font-display text-sm truncate">{artist.name}</span>
    </button>
  );
}

// Modal for a tapped location: name, description, and the artists currently
// standing on its tile. Clicking outside the box closes it. `location` stays
// set while the modal animates closed, so its content doesn't blank out.
export function LocationPanel({
  open,
  onClose,
  location,
  occupants,
  onSelectArtist,
}: {
  open: boolean;
  onClose: () => void;
  location: Location | null;
  occupants: Artist[];
  onSelectArtist: (artist: Artist) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={location?.name}>
      {location && (
        <div className="flex flex-col gap-lg overflow-y-auto p-xl">
          <h2 className="font-display text-xl text-center uppercase tracking-wide">
            {location.name}
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            {location.description}
          </p>
          {occupants.length > 0 ? (
            <div className="flex flex-col gap-sm">
              {occupants.map(a => (
                <ArtistStrip
                  key={a.artist_id}
                  artist={a}
                  onClick={() => onSelectArtist(a)}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted text-sm">
              Nobody here right now.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
