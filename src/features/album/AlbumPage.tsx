import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAlbum } from '../../hooks/collections';
import { useArtist } from '../../hooks/artists';
import { songCredit } from '../../services/slopbop';
import SongList from '../../components/songlist/SongList';
import CollectionDisplay from '../../components/CollectionDisplay';

/**
 * An album — the artist's own record, and the plainest of the three collection
 * pages: cover, credit line, tracklist, nothing else. It's the only one reached
 * from the Discography, because it's the only one that's part of the catalogue.
 *
 * Everything crowdsourced is deliberately absent: no submission panel (an album
 * has no `request_status` to gate one on) and no deadline strip.
 *
 * It keeps the QR toggle, though — what a scan is *for* differs here. On a
 * mixtape or jam it hands a room a way in to write; on an album there's nothing
 * left to write, so it's just the shortest route from a cover someone is looking
 * at to the record playing on their own phone.
 *
 * It does get its own background though: the twirl is "the thing a room paid
 * for" (see album-world.css), and the album is the record they came away with.
 */
export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const { album, songs, loading: albumLoading, refetch } = useAlbum(id ?? '');
  const { artist, loading: artistLoading } = useArtist(album?.artist_id ?? '');

  // Swap the app's diagonal stripes for the album's twirl for as long as this
  // page is mounted (styles/components/album-world.css). Above the early returns
  // so the loading and not-found states land in the same world.
  useEffect(() => {
    document.body.classList.add('album-world');
    return () => document.body.classList.remove('album-world');
  }, []);

  const loading = albumLoading || artistLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner large processing" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Album not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CollectionDisplay collection={album} artist={artist} />

      <div className="flex flex-col gap-lg px-lg pb-lg">
        <SongList
          songs={songs}
          onRefetch={refetch}
          toTrack={song => ({
            id: song._id,
            title: song.title || 'Untitled',
            coverUrl: song.cover_url || album.cover_url,
            audioUrl: song.audio_url || '',
            duration: song.duration,
            lyrics: song.lyrics,
            note: song.note,
            author: songCredit(song, artist),
            bops: song.bops,
            artistId: song.artist_id,
            artistName: artist?.name,
          })}
        />
      </div>
    </div>
  );
}
