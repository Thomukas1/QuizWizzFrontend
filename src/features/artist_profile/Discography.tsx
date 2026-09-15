import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollections } from '../../hooks/collections';
import { useSongs } from '../../hooks/songs';
import { isArtistsOwnWork, songCredit, type Collection, type Song } from '../../services/slopbop';
import AlbumCard from './AlbumCard';
import SongList from '../../components/songlist/SongList';

interface Props {
  artistId: string;
  artistName?: string;
  /**
   * The artist's `owner_id`, which is what a single's `created_by` is measured
   * against to sort it into a tab. Absent on an unclaimed artist — then nothing
   * can be the artist's own work, and every single reads as community.
   */
  ownerId?: string;
}

// The artist's catalogue, split across two tabs (see the `view` toggle below).
//
//   Original   the permanent catalogue — authored albums, plus the singles the
//              artist wrote themselves. This is the default view.
//   Community  mixtapes: a commissioned group's artifact from their own day.
//              Filing someone's birthday party under the label's discography
//              would misread it, so it lives behind its own tab — a holding
//              place while we work out how to make mixtapes truly ephemeral.
//              Also the singles a fan wrote: a jam winner is promoted by having
//              its `collection_id` cleared, so nothing but `created_by` would
//              tell it apart from a single the artist wrote.
//
// Jams are absent from both: a live session is not a release. One surfaces as
// the LIVE card at the top of the profile and is gone once it resolves.
//
// Singles are derived, not fetched: any song without a `collection_id`. Songs
// that belong to an album, mixtape, or jam all carry one, so they never fall
// through to singles. Which HALF a single lands in is derived too, from whether
// its `created_by` is the artist's owner. Collection-bound songs need no such
// test — the shelf they sit on already says which side they're on.
export interface GroupedDiscography {
  albums: { album: Collection; songs: Song[] }[];
  /** Singles the artist wrote themselves. */
  singles: Song[];
  /** Singles somebody else wrote — a won jam, today. */
  communitySingles: Song[];
  mixtapes: Collection[];
}

function useDiscography(artistId: string, ownerId?: string): {
  discography: GroupedDiscography;
  loading: boolean;
  refetch: () => void;
} {
  const { collections: albums, loading: albumsLoading } = useCollections(artistId, 'album');
  const { collections: mixtapes, loading: mixtapesLoading } = useCollections(artistId, 'mixtape');
  const { songs, loading: songsLoading, refetch } = useSongs(artistId);

  const discography = useMemo<GroupedDiscography>(() => {
    const songsByCollection = new Map<string, Song[]>();
    const singles: Song[] = [];
    const communitySingles: Song[] = [];

    for (const song of songs) {
      if (song.collection_id) {
        const list = songsByCollection.get(song.collection_id) ?? [];
        list.push(song);
        songsByCollection.set(song.collection_id, list);
      } else if (isArtistsOwnWork(song, ownerId)) {
        singles.push(song);
      } else {
        communitySingles.push(song);
      }
    }

    const group = (collections: Collection[]) =>
      collections.map(album => ({
        album,
        songs: songsByCollection.get(album._id) ?? [],
      }));

    return { albums: group(albums), singles, communitySingles, mixtapes };
  }, [albums, songs, mixtapes, ownerId]);

  return {
    discography,
    loading: albumsLoading || mixtapesLoading || songsLoading,
    refetch,
  };
}

type View = 'original' | 'community';

export default function Discography({ artistId, artistName, ownerId }: Props) {
  const { discography, loading, refetch } = useDiscography(artistId, ownerId);
  const navigate = useNavigate();
  const [view, setView] = useState<View>('original');

  if (loading) return null;

  const hasOriginal = discography.albums.length > 0 || discography.singles.length > 0;
  const hasCommunity = discography.mixtapes.length > 0 || discography.communitySingles.length > 0;
  if (!hasOriginal && !hasCommunity) return null;

  // Shared by both tabs' song lists — the only thing that differs between them
  // is which list is passed in. `songCredit` reads just these two artist fields.
  const toTrack = (song: Song) => ({
    id: song._id,
    title: song.title || 'Untitled',
    coverUrl: song.cover_url,
    audioUrl: song.audio_url || '',
    duration: song.duration,
    lyrics: song.lyrics,
    note: song.note,
    author: songCredit(song, { owner_id: ownerId, name: artistName }),
    bops: song.bops,
    artistId: song.artist_id,
    artistName,
  });

  // The toggle only earns its place once there's community work to switch to;
  // most artists have none, and a permanently half-empty control is just noise.
  // Without it the page reads exactly as it did before mixtapes existed.
  const showToggle = hasOriginal && hasCommunity;
  // Guard against a stale selection: if the artist has only mixtapes, the
  // default 'original' would render an empty tab with no way back.
  const activeView: View = showToggle ? view : hasCommunity ? 'community' : 'original';

  return (
    <div className="flex flex-col gap-lg">
      {showToggle && (
        <div className="disco-tabs" role="tablist">
          {([
            { value: 'original', label: 'Original' },
            { value: 'community', label: 'Community' },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              className={`disco-tab${view === value ? ' selected' : ''}`}
              onClick={() => setView(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {activeView === 'original' && (
        <>
          {discography.albums.length > 0 && (
            <div className="flex flex-col gap-md">
              <h2 className="font-display text-lg">Albums</h2>
              <div className="grid grid-cols-2 gap-md">
                {discography.albums.map(({ album }) => (
                  <AlbumCard
                    key={album._id}
                    coverUrl={album.cover_url}
                    title={album.title || 'Untitled'}
                    onClick={() => navigate(`/albums/${album._id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {discography.singles.length > 0 && (
            <div className="flex flex-col gap-md">
              <h2 className="font-display text-lg">Singles</h2>
              <SongList songs={discography.singles} onRefetch={refetch} toTrack={toTrack} />
            </div>
          )}
        </>
      )}

      {activeView === 'community' && (
        <>
          {discography.mixtapes.length > 0 && (
            <div className="flex flex-col gap-md">
              <h2 className="font-display text-lg">Mixtapes</h2>
              <div className="grid grid-cols-2 gap-md">
                {discography.mixtapes.map(mixtape => (
                  <AlbumCard
                    key={mixtape._id}
                    coverUrl={mixtape.cover_url}
                    title={mixtape.title || 'Untitled'}
                    onClick={() => navigate(`/mixtapes/${mixtape._id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {discography.communitySingles.length > 0 && (
            <div className="flex flex-col gap-md">
              <h2 className="font-display text-lg">Singles</h2>
              <SongList songs={discography.communitySingles} onRefetch={refetch} toTrack={toTrack} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
