import { useNavigate } from 'react-router-dom';
import { useArtists } from '../../hooks/artists';
import { isSigned } from '../../services/slopbop';
import { ArtistCard } from '../../components/ArtistCard';

// The four elements every artist is built from — each its own emoji + colour so
// the roster reads as a designed system, not a random generator.
const FACETS: { emoji: string; label: string; color: string }[] = [
  { emoji: '🧠', label: 'Personality', color: 'var(--facet-personality)' },
  { emoji: '🎨', label: 'Appearance',  color: 'var(--facet-appearance)' },
  { emoji: '🎤', label: 'Voice',       color: 'var(--facet-voice)' },
  { emoji: '🎧', label: 'Music taste',  color: 'var(--facet-taste)' },
];

export default function RosterPage() {
  const { artists, loading } = useArtists();
  const navigate = useNavigate();

  // The roster is the label's signed acts — guests never make the wall.
  const roster = artists.filter(isSigned);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-md py-lg">
        <h1 className="font-display text-2xl">The Roster</h1>

        <p className="text-base leading-relaxed">
          Slopbop artists are synthetic agents, built from these base elements:
        </p>

        <div className="grid grid-cols-2 gap-sm">
          {FACETS.map(({ emoji, label, color }) => (
            <div
              key={label}
              className="facet-card"
              style={{ '--facet': color } as React.CSSProperties}
            >
              <span className="facet-card__emoji" aria-hidden="true">{emoji}</span>
              <span className="facet-card__label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4xl">
          <div className="spinner large processing" />
        </div>
      ) : (
        <div className="flex flex-col gap-lg border-t border-border pt-lg">
          {roster.map(artist => (
            <ArtistCard key={artist.artist_id} artist={artist} />
          ))}
          {/* The end of the roster is the moment of highest intent — someone
              who scrolled every artist has just spent real attention on the
              thing they'd be applying to become. */}
          <div className="px-md pb-2xl">
            <div className="frosted-card !p-xl flex flex-col items-center gap-lg text-center">
              <p className="text-base leading-relaxed">
                Want to become a synthetic artist?
              </p>
              <button type="button" className="secondary" onClick={() => navigate('/apply')}>
                APPLY NOW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
