import { isReleased, songCredit, type Song } from '../../services/slopbop';
import { useMixtape } from '../../hooks/collections';
import { useArtist } from '../../hooks/artists';
import { useMusicPlayer, type Track } from '../../context/MusicPlayerContext';
import SingleCard from '../../components/songlist/SingleCard';
import Img from '../../primitives/Img';

// A real mixtape, so the keepsake is something you can hear instead of imagine.
const SHOWCASE_MIXTAPE_ID = '6a47b0993152ea46f01ce86d';

// A sneak peek, not the mixtape page: the best few rows, no sort toggle, no link
// through to /mixtapes/:id. The queue is only what's on screen — playing on into
// tracks nobody can see would be the player going somewhere it wasn't asked to.
const PREVIEW_COUNT = 3;

export function ExampleMixtape() {
  const { mixtape, songs, loading } = useMixtape(SHOWCASE_MIXTAPE_ID);
  // Only resolves once the mixtape lands — an empty key is a no-op fetch.
  const { artist } = useArtist(mixtape?.artist_id ?? '');
  const { playQueue, track } = useMusicPlayer();

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-lg h-40 flex items-center justify-center">
        <div className="spinner large processing" />
      </div>
    );
  }

  // The pitch stands on its own — a broken card is worse than no card.
  if (!mixtape) return null;

  // Best-first, by SongList's 'bops ↑' order — a showcase should
  // lead with what the group actually bopped, not whatever landed first.
  // Unreleased songs ship with no audio at all, so they can't be queued.
  const playable = songs
    .filter(song => isReleased(song) && song.audio_url)
    .sort((a, b) => (b.bops ?? 0) - (a.bops ?? 0));

  const toTrack = (song: Song): Track => ({
    id: song._id,
    title: song.title || 'Untitled',
    coverUrl: song.cover_url,
    audioUrl: song.audio_url!,
    duration: song.duration,
    lyrics: song.lyrics,
    note: song.note,
    author: songCredit(song, artist),
    bops: song.bops,
    artistId: mixtape.artist_id,
    artistName: artist?.name,
  });

  // What you see is what plays: the queue is the previewed rows only, so tap
  // index == queue index and the last one ends the peek instead of running on
  // into tracks that were never on screen.
  const preview = playable.slice(0, PREVIEW_COUNT);
  const queue = preview.map(toTrack);
  const remaining = playable.length - preview.length;

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="flex gap-md p-md">
        <Img
          src={mixtape.cover_url || '/Images/default_song_cover.png'}
          alt=""
          className="w-24 h-24 rounded-md flex-shrink-0"
          imgClassName="object-cover"
        />
        <div className="flex flex-col justify-center gap-0.5 min-w-0">
          <p className="subtle text-[10px] uppercase tracking-wider">Example mixtape</p>
          <h3 className="font-display text-lg leading-tight">{mixtape.title || 'Untitled'}</h3>
          <p className="text-sm text-muted truncate">
            {playable.length} songs{artist?.name ? ` · ${artist.name}` : ''}
          </p>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="border-t border-border p-sm flex flex-col">
          {preview.map((song, i) => (
            <div key={song._id}>
              {i > 0 && <div className="border-t border-divider my-xs" />}
              <SingleCard
                coverUrl={song.cover_url}
                title={song.title || 'Untitled'}
                duration={song.duration}
                bops={song.bops}
                active={track?.id === song._id}
                onClick={() => playQueue(queue, i)}
              />
            </div>
          ))}
          {remaining > 0 && (
            <p className="text-xs text-muted px-sm pt-sm">+ {remaining} more on the record</p>
          )}
        </div>
      )}
    </div>
  );
}
