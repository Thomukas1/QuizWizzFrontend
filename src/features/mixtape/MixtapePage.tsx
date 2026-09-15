import { useParams } from 'react-router-dom';
import { useMixtape } from '../../hooks/collections';
import { useArtist } from '../../hooks/artists';
import { songCredit } from '../../services/slopbop';
import SongList from '../../components/songlist/SongList';
import OpenCall, { type OpenCallCopy } from '../../components/opencall/OpenCall';
import Notice from '../../components/opencall/Notice';
import CollectionDisplay from '../../components/CollectionDisplay';
import { Countdown } from '../../primitives/Countdown';

export default function MixtapePage() {
  const { id } = useParams<{ id: string }>();
  const {
    mixtape, songs, requestStatus, openCallStatus, loading: mixtapeLoading, refetch,
  } = useMixtape(id ?? '');
  const { artist, loading: artistLoading } = useArtist(mixtape?.artist_id ?? '');

  // `!mixtape` and not just `loading`: a running open call polls itself, and each
  // poll raises `loading` again — spinnering on that would blank the page every
  // 30 seconds.
  const loading = (mixtapeLoading && !mixtape) || artistLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner large processing" />
      </div>
    );
  }

  if (!mixtape) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Mixtape not found</p>
      </div>
    );
  }

  // No song exists until the window shuts, so there's no tracklist during the
  // call — an empty one under a live mixtape reads as a page that failed.
  const phase = openCallStatus?.phase ?? null;
  const calling = phase === 'scheduled' || phase === 'open';

  // What this mixtape says about its own open call. Same machine a jam runs,
  // different room: this is a group's own day, not a competition.
  const artistName = artist?.name ?? 'this artist';
  const copy: OpenCallCopy = {
    scheduled: (
      <p className="text-sm leading-relaxed">
        The song submissions for this mixtape opens in…
      </p>
    ),
    pitch: (
      <p className="text-sm leading-relaxed">
        Help {artistName} produce this mixtape by submitting a song with your own
        custom lyrics.
      </p>
    ),
    // No room left to write in, and no songs yet either — so the one fact worth
    // giving is when the tracks arrive.
    full: (
      <Notice icon="📼" headline="This mixtape is full!">
        <p>All {requestStatus?.max_tracks} slots have been taken — no more songs can be written.</p>
        {requestStatus?.submission_deadline && (
          <p className="pt-xs">
            The tracks drop when submissions close, in{' '}
            <Countdown
              target={requestStatus.submission_deadline}
              onExpire={refetch}
              render={r => <span className="font-semibold text-accent">{r}</span>}
            />
          </p>
        )}
      </Notice>
    ),
    // Only until the first track lands — after that the tracklist's own countdown
    // card says "more coming" better than a notice can.
    awaiting: songs.length === 0 ? (
      <Notice
        icon={<div className="spinner large processing" />}
        tone="plain"
        headline="The mixtape is being produced — hang tight!"
      />
    ) : undefined,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <CollectionDisplay collection={mixtape} artist={artist} />

      <div className="flex flex-col gap-lg px-lg pb-lg">
        {!calling && (
          <SongList
            songs={songs}
            onRefetch={refetch}
            toTrack={song => ({
              id: song._id,
              title: song.title || 'Untitled',
              coverUrl: song.cover_url || mixtape.cover_url,
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
        )}

        {requestStatus && openCallStatus && (
          <OpenCall
            collectionId={mixtape._id}
            status={requestStatus}
            phase={openCallStatus.phase}
            copy={copy}
            hasContentAbove={!calling}
            refresh={refetch}
          />
        )}
      </div>
    </div>
  );
}
