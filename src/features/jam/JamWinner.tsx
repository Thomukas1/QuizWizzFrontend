import type { Song } from '../../services/slopbop';
import { useMusicPlayer, type Track } from '../../context/MusicPlayerContext';
import SingleCard from '../../components/songlist/SingleCard';

interface Props {
  song: Song;
  /** The page's own song→track mapping, so the winner's cover and credit read
   *  exactly like every other row on the jam. */
  toTrack: (song: Song) => Track;
}

/**
 * The one song that survived a jam.
 *
 * Deliberately not a `SongList`: a list is a set of things to compare, and there
 * is nothing here to compare it to — a jam resolves to exactly one winner. So
 * this is a prize on a plinth, with a single `SingleCard` under it doing the
 * playing. It carries the page's only spend of lime, which is what makes the
 * moment land against the jam world's dark
 * (`styles/components/jam-winner.css`).
 */
export default function JamWinner({ song, toTrack }: Props) {
  const { playQueue, track, togglePlay } = useMusicPlayer();
  const winner = toTrack(song);
  const active = track?.id === song._id;

  return (
    <div className="jam-winner">
      <span className="jam-winner__crown" aria-hidden="true">👑</span>
      <p className="jam-winner__title">Listen to the winner's song!</p>

      <div className="jam-winner__song">
        <SingleCard
          coverUrl={winner.coverUrl}
          title={winner.title}
          duration={winner.duration}
          bops={winner.bops}
          active={active}
          // Resume rather than reload, the same as a list row: a second tap on
          // the playing track shouldn't restart the fetch.
          onClick={() => (active ? togglePlay() : playQueue([winner], 0))}
        />
      </div>
    </div>
  );
}
