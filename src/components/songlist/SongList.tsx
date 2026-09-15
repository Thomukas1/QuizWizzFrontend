import { useState } from 'react';
import { isReleased, type Song } from '../../services/slopbop';
import { useMusicPlayer, type Track } from '../../context/MusicPlayerContext';
import SingleCard from './SingleCard';
import ProcessingCard from './ProcessingCard';

export type SongSort = 'release' | 'bops-desc' | 'bops-asc';

// The sort toggle's segments, in display order. Labelled here rather than
// derived from the key, because the arrow is the label — and it points at where
// the *big* numbers go, not at the sort direction: ↑ puts the most-bopped song
// on top, ↓ puts the least-bopped one there (the bottom of the mixtape, which
// is its own kind of fun).
const SORTS: { key: SongSort; label: string }[] = [
  { key: 'release', label: 'Release' },
  { key: 'bops-desc', label: 'Bops ↑' },
  { key: 'bops-asc', label: 'Bops ↓' },
];

// Stable fallback when no re-fetch is wired in — keeps the countdown card's
// poll effect from re-subscribing every render.
const noop = () => {};

interface Props {
  songs: Song[];
  /** Maps a song to a playable track — supplies cover/artist context per caller. */
  toTrack: (song: Song) => Track;
  /**
   * Re-fetch the songs. Called when an upcoming song's countdown elapses — the
   * released song (with its now-available audio) has to come back from the
   * server before it can turn into a playable row. Should be referentially
   * stable (it's a dependency of the countdown card's poll).
   */
  onRefetch?: () => void;
  /**
   * Which order the list opens in. Defaults to release order — the catalogue
   * reading. A live jam opens on `bops-desc` instead, because there the order
   * *is* the standings, not a preference about them. Only the initial value; the
   * toggle owns it from then on.
   */
  defaultSort?: SongSort;
}

/**
 * The canonical way to render a list of songs: a three-way sort toggle (release
 * order, most-bopped first, least-bopped first) and a play-all button over a
 * card per song. Shared by the artist's Singles section and the mixtape
 * tracklist so the two stay identical.
 *
 * Playback is what-you-see-is-what-plays: hitting play-all, or tapping a song,
 * snapshots the list in its *current* displayed order into the player's queue
 * (tapping song N starts there and plays through to the end). Switching the
 * sort afterwards only affects the next play — it never disturbs a live queue.
 *
 * An upcoming song (`released: false`) isn't playable yet — its audio isn't even
 * on the client — so it's kept out of the list and the queue entirely. Only the
 * *soonest* such song is surfaced, as a "processing" countdown card pinned below
 * the released rows; when its timer elapses the card asks us to re-fetch, and the
 * now-released song (with audio) comes back as a normal row.
 *
 * With nothing to play the list stays on screen as an empty state — the controls
 * remain, play-all disabled — so callers can render it unconditionally. A caller
 * that shouldn't announce an empty section at all (a heading over zero songs)
 * still decides that for itself, by not rendering us.
 */
export default function SongList({ songs, toTrack, onRefetch, defaultSort = 'release' }: Props) {
  const { playQueue, track, playing, togglePlay } = useMusicPlayer();
  const [sort, setSort] = useState<SongSort>(defaultSort);

  const released = songs.filter(s => isReleased(s));
  // The soonest still-unreleased song — the only one shown, as a countdown card.
  const nextUp = songs
    .filter(s => !isReleased(s))
    .sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''))[0];

  const sorted = [...released].sort((a, b) => {
    if (sort === 'release') {
      // Release order: oldest first (id 1 first). Fall back to created_at so
      // undated songs stay put rather than jumping around.
      const ka = a.release_date || a.created_at || '';
      const kb = b.release_date || b.created_at || '';
      return ka.localeCompare(kb);
    }
    // Bops, and nothing else — the count *is* the ranking. Direction is the
    // only thing separating the two bop modes.
    const diff = (a.bops ?? 0) - (b.bops ?? 0);
    return sort === 'bops-desc' ? -diff : diff;
  });

  // Snapshot in the exact order shown, so tap index == queue index.
  const tracks = sorted.map(toTrack);

  // This list "owns" playback when the playing track is one of its songs —
  // so its play-all button becomes a pause/resume toggle (keeping the queue
  // position) instead of restarting from the top.
  const isCurrentList = !!track && sorted.some(s => s._id === track.id);
  const showPause = isCurrentList && playing;

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between gap-md">
        <div className="flex rounded-md overflow-hidden border border-border text-xs flex-shrink-0">
          {SORTS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={`px-sm py-xs whitespace-nowrap transition-base ${
                sort === key ? 'bg-surface text-primary' : 'text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={tracks.length === 0}
          onClick={() => (isCurrentList ? togglePlay() : playQueue(tracks, 0))}
          aria-label={showPause ? 'Pause' : 'Play all'}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0
                     cursor-pointer active:scale-90 transition-base
                     disabled:opacity-30 disabled:cursor-default disabled:active:scale-100"
        >
          {showPause ? (
            <svg viewBox="0 0 24 24" fill="var(--black)" className="w-4 h-4">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="var(--black)" className="w-5 h-5 ml-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
      {/* An empty list still renders its box: a section that vanishes reads as
          broken, where "nothing here yet" reads as a state. Suppressed while a
          countdown card is up — that *is* the list's content for now. */}
      {sorted.length === 0 && !nextUp && (
        <div className="flex items-center justify-center bg-surface-2 rounded-lg p-lg">
          <p className="text-sm subtle">No songs in this list yet</p>
        </div>
      )}
      {sorted.length > 0 && (
        <div className="flex flex-col bg-surface-2 rounded-lg p-sm">
          {sorted.map((song, i) => (
            <div key={song._id}>
              {i > 0 && <div className="border-t border-divider my-xs" />}
              <SingleCard
                coverUrl={song.cover_url}
                title={song.title || 'Untitled'}
                duration={song.duration}
                bops={song.bops}
                active={track?.id === song._id}
                // Resume rather than reload — on a slow connection an impatient
                // second tap would otherwise restart the fetch and starve playback.
                onClick={() =>
                  track?.id === song._id ? togglePlay() : playQueue(tracks, i)
                }
              />
            </div>
          ))}
        </div>
      )}
      {/* Pinned below the list and outside it: the soonest upcoming song, never
          touched by the sort toggle — always the tail of the section. */}
      {nextUp && (
        <ProcessingCard
          key={nextUp._id}
          coverUrl={nextUp.cover_url}
          title={nextUp.title}
          releaseDate={nextUp.release_date!}
          onReleaseElapsed={onRefetch ?? noop}
        />
      )}
    </div>
  );
}
