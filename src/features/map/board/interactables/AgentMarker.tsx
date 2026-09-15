import { Artist } from '../../../../services/slopbop';

// An agent's on-board face: avatar above a name label. Tapping opens their
// bottom sheet. Positioning (and the glide when their tile changes) is the
// <Sprite> wrapper's job; this is pure presentation.
export function AgentMarker({
  artist,
  onClick,
}: {
  artist: Artist;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 active:opacity-70"
    >
      <img
        src={artist.image_url ?? '/Images/mystery-actor.png'}
        alt={artist.name}
        className="w-11 h-11 rounded-full object-cover object-top border-2 border-white shadow-md"
      />
      <span className="px-1 rounded bg-black/70 text-xs leading-tight">
        {artist.name}
      </span>
    </button>
  );
}
