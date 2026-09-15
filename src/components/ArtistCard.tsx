import { Link } from 'react-router-dom';
import { Artist, songCredit } from '../services/slopbop';
import { useTopSong } from '../hooks/songs';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import SingleCard from './songlist/SingleCard';
import Img from '../primitives/Img';
import TagPills from '../primitives/TagPills';

export function ArtistCard({ artist }: { artist: Artist }) {
  const { topSong } = useTopSong(artist.artist_id);
  const { play } = useMusicPlayer();

  return (
    <div className="w-full">
      <Link
        to={`/artists/${artist.artist_id}`}
        className="block w-full active:opacity-70 transition-opacity"
      >
        <Img
          src={artist.image_url ?? '/Images/mystery-actor.png'}
          alt={artist.name}
          className="w-full aspect-video"
          imgClassName="object-cover object-top"
        />
        <div className="px-lg py-sm bg-surface flex flex-col gap-sm">
          <p className="font-display text-xl">{artist.name}</p>
          <TagPills tags={artist.genres} />
        </div>
      </Link>

      {topSong && (
        <div className="px-lg pb-lg pt-sm bg-surface flex flex-col gap-xs">
          <p className="eyebrow">Biggest Bop</p>
          <div className="bg-surface-2 rounded-lg p-sm">
            <SingleCard
              coverUrl={topSong.cover_url}
              title={topSong.title || 'Untitled'}
              duration={topSong.duration}
              bops={topSong.bops}
              onClick={() => play({
                id: topSong._id,
                title: topSong.title || 'Untitled',
                coverUrl: topSong.cover_url,
                audioUrl: topSong.audio_url!,
                duration: topSong.duration,
                lyrics: topSong.lyrics,
                note: topSong.note,
                author: songCredit(topSong, artist),
                bops: topSong.bops,
                artistId: artist.artist_id,
                artistName: artist.name,
              })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
