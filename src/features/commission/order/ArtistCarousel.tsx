import { Artist } from '../../../services/slopbop';
import { ArtistCard } from '../../../components/ArtistCard';

interface Props {
  artists: Artist[];
  index: number;
  onIndexChange: (index: number) => void;
}

// One artist at a time, arrows to move. The visible card is the selected one —
// there's no separate "select" tap, so the lime ring is feedback tying the card
// to the Selected artist field below it rather than a toggle.
export function ArtistCarousel({ artists, index, onIndexChange }: Props) {
  if (artists.length === 0) return null;

  const canMove = artists.length > 1;

  // Wrap around: with a handful of artists, a dead-ended arrow reads as broken.
  const step = (delta: number) =>
    onIndexChange((index + delta + artists.length) % artists.length);

  const artist = artists[index];

  return (
    <div className="relative">
      <div className="rounded-lg overflow-hidden ring-2 ring-accent">
        <ArtistCard key={artist.artist_id} artist={artist} />
      </div>

      {/* Matches the card image's aspect-video, so the arrows centre on the
          artwork instead of the middle of a variable-height card. Shown even
          for a lone artist — dimmed and inert, so the card still reads as one
          of a set rather than the only thing on offer. */}
      <div className="absolute inset-x-0 top-0 aspect-video flex items-center justify-between px-sm pointer-events-none">
        <ArrowButton label="Previous artist" onClick={() => step(-1)} disabled={!canMove}>
          ‹
        </ArrowButton>
        <ArrowButton label="Next artist" onClick={() => step(1)} disabled={!canMove}>
          ›
        </ArrowButton>
      </div>
    </div>
  );
}

function ArrowButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`pointer-events-auto w-9 h-9 rounded-full bg-black/70 text-white font-display text-lg leading-none flex items-center justify-center transition-opacity ${
        disabled ? 'opacity-30' : 'active:opacity-70'
      }`}
    >
      {children}
    </button>
  );
}
