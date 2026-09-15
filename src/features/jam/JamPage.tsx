import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useJam } from '../../hooks/collections';
import { useSong } from '../../hooks/songs';
import { useArtist } from '../../hooks/artists';
import { isReleased, songCredit, type Song } from '../../services/slopbop';
import SongList from '../../components/songlist/SongList';
import OpenCall, { type OpenCallCopy } from '../../components/opencall/OpenCall';
import Notice from '../../components/opencall/Notice';
import CollectionDisplay from '../../components/CollectionDisplay';
import { Countdown } from '../../primitives/Countdown';
import JamWinner from './JamWinner';

export default function JamPage() {
  const { id } = useParams<{ id: string }>();
  const { jam, songs, requestStatus, openCallStatus, loading: jamLoading, refetch } = useJam(id ?? '');
  const { artist, loading: artistLoading } = useArtist(jam?.artist_id ?? '');
  // A resolved jam comes back with `songs: []` — the winner was promoted out of
  // the collection and the also-rans deleted — so the one song worth showing is
  // the one thing the jam's own read can't hand us. An empty id is idle, which
  // is every other phase.
  const { song: winner } = useSong(openCallStatus?.selected_song_id ?? '');

  // Swap the app's diagonal stripes for the demo world — an unfinished skin with
  // the code showing through (styles/components/jam-world.css). Above the
  // early returns so the loading and not-found states land in the same world.
  useEffect(() => {
    document.body.classList.add('jam-world');
    return () => document.body.classList.remove('jam-world');
  }, []);

  // `!jam` and not just `loading`: an open jam polls itself for the live
  // standings, and each poll raises `loading` again — spinnering on that would
  // blank the page every 30 seconds.
  const loading = (jamLoading && !jam) || artistLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner large processing" />
      </div>
    );
  }

  if (!jam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Jam not found</p>
      </div>
    );
  }

  const phase = openCallStatus?.phase ?? null;
  const resolved = phase === 'resolved';
  // Still an open call — in a `batch` jam no song exists until the window shuts,
  // so there's no tracklist to show.
  const calling = phase === 'scheduled' || phase === 'open';
  // An instant jam produces each song as it's written, so the list is the place
  // those tracks appear and stands from the moment the door opens — empty at
  // first, which here is an invitation rather than a failed read.
  const instant = jam.drain === 'instant';
  // Which leaves `awaiting_resolution` as the one phase a batch jam has a list
  // in. No status at all falls through to it: the safe reading of a jam we can't
  // place.
  const showTracklist =
    (!resolved && !calling && phase !== 'closed') || (instant && phase === 'open');

  // Every list on this page reads the same way — including the promoted winner,
  // which inherited the jam's cover on its way out.
  const toTrack = (song: Song) => ({
    id: song._id,
    title: song.title || 'Untitled',
    coverUrl: song.cover_url || jam.cover_url,
    audioUrl: song.audio_url || '',
    duration: song.duration,
    lyrics: song.lyrics,
    note: song.note,
    author: songCredit(song, artist),
    bops: song.bops,
    artistId: song.artist_id,
    artistName: artist?.name,
  });

  // What this jam says about its own open call. The panel owns the states; these
  // are the words, and they're a jam's.
  const artistName = artist?.name ?? 'this artist';
  // Every track out and the jam not yet called — the one stretch of
  // `awaiting_resolution` where "the bops are being counted" is true.
  const allOut = songs.length > 0 && songs.every(isReleased);
  const copy: OpenCallCopy = {
    scheduled: <p className="text-sm leading-relaxed">The jam opens in…</p>,
    // One song per device: bops settle the jam, so a device that can file five
    // entries is filing five chances at the Single.
    pitch: (
      <>
        <p className="text-sm leading-relaxed">
          We have {artistName} on the mic, jamming on the{' '}
          <span className="text-accent">songs that you write</span>.
        </p>
        <p className="text-sm leading-relaxed">
          The song with the most bops gets upgraded into an official Single,
          while the rest will perish…
        </p>
      </>
    ),
    // No room left to write in — the one fact worth giving is where the tracks
    // are. A batch jam has none until the window shuts, so it counts down to
    // that; an instant one is already dropping them above.
    full: instant ? (
      <Notice icon="🎤" headline="This jam is full!">
        <p>All {requestStatus?.max_tracks} slots have been taken — no more songs can be written.</p>
        <p className="pt-xs">The last tracks are still landing above.</p>
      </Notice>
    ) : (
      <Notice icon="🎤" headline="This jam is full!">
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
    // The tally only makes sense once every track is out — until then, telling a
    // room that's still hearing songs to stand by is the wrong thing to say.
    awaiting: allOut ? (
      <Notice icon="🏆" headline="The jam is over!">
        The bops are being counted — the top song becomes {artistName}'s next Single.
      </Notice>
    ) : (
      <Notice icon="🎧" headline="Submissions are closed!">
        The songs are dropping one by one — bop the one you want as the Single.
      </Notice>
    ),
    // Nobody entered, so there's no winner and no tracklist. Saying so is the
    // page's last job — an empty list with no explanation reads as a page that
    // failed to load.
    closed: (
      <Notice icon="🥀" tone="plain" headline="This jam ended empty.">
        Nobody wrote a song in time — no Single from this one.
      </Notice>
    ),
  };

  return (
    <div className="flex flex-col min-h-screen">
      <CollectionDisplay collection={jam} artist={artist} />

      <div className="flex flex-col gap-lg px-lg pb-lg">
        {/* Three shapes, and the phase picks between them.

            While a batch call runs there's no tracklist at all — a "no songs
            yet" box under a live jam reads as a page that failed, not an
            invitation — so the panel below is the page; an instant call inverts
            that, since the empty list is where the room watches its own songs
            appear. Either way, once submissions shut the tracks arrive one at a
            time and the list IS the scoreboard, opening most-bopped-first. Once
            a song has won there's only it left to show, and `JamWinner` takes
            over. */}
        {resolved && winner && <JamWinner song={winner} toTrack={toTrack} />}
        {showTracklist && (
          <SongList
            songs={songs}
            onRefetch={refetch}
            toTrack={toTrack}
            defaultSort="bops-desc"
          />
        )}

        {requestStatus && openCallStatus && (
          <OpenCall
            collectionId={jam._id}
            status={requestStatus}
            phase={openCallStatus.phase}
            copy={copy}
            hasContentAbove={showTracklist || resolved}
            refresh={refetch}
          />
        )}
      </div>
    </div>
  );
}
