import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { useToast } from './ToastContext';
import { createMediaLoader, type MediaLoader } from '../services/arweave';

export interface Track {
  id: string;
  title: string;
  coverUrl?: string;
  audioUrl: string;
  duration?: number;
  lyrics?: string;
  /** The artist's note on the song — null before release, like the lyrics. */
  note?: string | null;
  author?: string;
  /** Seeds the player's bop count — see `useSongBop`. Absent reads as 0. */
  bops?: number;
  artistId?: string;
  artistName?: string;
}

interface MusicPlayerContextValue {
  track: Track | null;
  playing: boolean;
  loading: boolean;
  currentTime: number;
  duration: number;
  expanded: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  play: (track: Track) => void;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skip: (delta: number) => void;
  next: () => void;
  prev: () => void;
  expand: () => void;
  collapse: () => void;
  close: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);


export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // The active queue is a snapshot taken at play() time. Held in refs (not
  // state) so the `ended` handler — registered once on mount — can advance it
  // without going stale, and so re-sorting the source list can't disturb it.
  const queueRef = useRef<Track[]>([]);
  const indexRef = useRef(0);

  // …but the position also has to be *rendered* (the prev/next stickers appear
  // and disappear with it), and refs don't re-render. Mirrored into state, which
  // only ever changes when the queue or the index does — go() owns both.
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueLength, setQueueLength] = useState(0);

  // Getting bytes into the element — gateways, retries, watchdogs — belongs to
  // the loader, created alongside the element below. The player only starts
  // loads and is told when one is waiting or has died.
  const loaderRef = useRef<MediaLoader | null>(null);

  // Surface a failed play() instead of swallowing it. This is for *resuming* a
  // track that already loaded — a failed load is the loader's business.
  // AbortError is the one exception: it just means a newer load superseded this.
  const handlePlayError = useCallback((err: unknown) => {
    setPlaying(false);
    setLoading(false);
    if ((err as DOMException)?.name !== 'AbortError') {
      showToast("Couldn't play this song — check your connection and try again.");
    }
  }, [showToast]);

  // Load a track into the audio element and start it. Stable so the mount
  // effect's `ended` handler can call it to auto-advance the queue.
  const loadAndPlay = useCallback((t: Track) => {
    if (!loaderRef.current) return;
    setTrack(t);
    setCurrentTime(0);
    setDuration(t.duration ?? 0);
    setPlaying(true);
    // Called straight from the click that asked for it, so play() lands inside
    // the gesture and autoplay policy doesn't block it.
    loaderRef.current.load(t.audioUrl, { play: true });
  }, []);

  // Jump to a queue position. The single place the index moves, so the ref and
  // the rendered mirror can't drift apart. Out-of-range is a no-op.
  const go = useCallback((i: number) => {
    if (i < 0 || i >= queueRef.current.length) return;
    indexRef.current = i;
    setQueueIndex(i);
    loadAndPlay(queueRef.current[i]);
  }, [loadAndPlay]);

  // Create a persistent audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    // Everything about *getting* the bytes. It attaches its own listeners for the
    // load lifecycle; the ones below are the player's own concerns.
    loaderRef.current = createMediaLoader(audio, {
      onLoadingChange: setLoading,
      onFailed: message => {
        setPlaying(false);
        showToast(message);
      },
    });

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    // A gateway that answers 200 with no Content-Length (arweave.net does) leaves
    // `duration` at Infinity until enough is buffered to read the file's own Xing
    // header. So take the element's value only once it's real — otherwise Infinity
    // clobbers the duration the track was seeded with — and listen for the
    // correction as well as the first report.
    const onDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    // Advance to the next queued track, or stop at the end of the queue.
    const onEnded = () => {
      if (indexRef.current + 1 < queueRef.current.length) {
        go(indexRef.current + 1);
      } else {
        setPlaying(false);
      }
    };
    // Mirror the element's own play state, so the button stays honest when
    // playback stops for reasons we never initiated (OS interruption, etc).
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      loaderRef.current?.dispose();
      loaderRef.current = null;
      audio.pause();
    };
    // Every dependency is stable, so the audio element is still set up once.
  }, [go, showToast]);

  // Play an ordered list as a queue, starting at `startIndex`; each track
  // auto-advances to the next when it ends.
  //
  // `startIndex` is a playhead position, not a slice point — callers pass the
  // *whole* list they're rendering and the row that was pressed, so pressing
  // row 4 leaves rows 1-3 behind the playhead and prev/next can walk the full
  // list either way. This is what makes the queue de-facto songlist-shaped:
  // whatever list you press in becomes the queue, replacing the previous one.
  //
  // The list is snapshotted here, so the caller re-sorting/filtering its source
  // afterwards won't affect what's playing — a new queue only forms on the next
  // playQueue() call. Trade-off: re-sorting mid-playback leaves prev/next
  // walking the order that was on screen when playback started.
  const playQueue = useCallback((tracks: Track[], startIndex = 0) => {
    if (!tracks.length) return;
    queueRef.current = tracks;
    setQueueLength(tracks.length);
    setExpanded(false);
    go(Math.max(0, Math.min(startIndex, tracks.length - 1)));
  }, [go]);

  // Convenience: play a single track as a one-item queue.
  const play = useCallback((t: Track) => playQueue([t], 0), [playQueue]);

  // Imperative on purpose: routing play() through state + an effect defers it
  // past the click, and Safari/Firefox reject an out-of-gesture play() when no
  // in-gesture one has succeeded yet. Reads `paused` off the element, not our
  // mirrored state, so a stale flag can't pick the wrong branch.
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    // A load that failed for good leaves the element with `error` set and no
    // source, where play() can only reject — so pressing play would just replay
    // the same error forever, and only a page reload ever fixed it. Re-run the
    // load instead, with a fresh budget: the button is a real retry.
    if (audio.error || audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      setPlaying(true);
      loaderRef.current?.reload();
      return;
    }
    setPlaying(true);
    audio.play().catch(handlePlayError);
  }, [track, handlePlayError]);

  const next = useCallback(() => go(indexRef.current + 1), [go]);
  const prev = useCallback(() => go(indexRef.current - 1), [go]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + delta, audio.duration || 0));
  }, []);

  const expand = useCallback(() => setExpanded(true), []);
  const collapse = useCallback(() => setExpanded(false), []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    // Drop any load in flight — a closed player must not resurrect itself.
    loaderRef.current?.cancel();
    queueRef.current = [];
    indexRef.current = 0;
    setQueueIndex(0);
    setQueueLength(0);
    setPlaying(false);
    setLoading(false);
    setCurrentTime(0);
    setTrack(null);
    setExpanded(false);
  }, []);

  return (
    <MusicPlayerContext.Provider
      value={{
        track,
        playing,
        loading,
        currentTime,
        duration,
        expanded,
        hasNext: queueIndex < queueLength - 1,
        hasPrev: queueIndex > 0,
        play,
        playQueue,
        togglePlay,
        seek,
        skip,
        next,
        prev,
        expand,
        collapse,
        close,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  return ctx;
}
