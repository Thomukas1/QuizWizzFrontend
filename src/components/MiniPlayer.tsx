import { useEffect, useState } from 'react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import Img from '../primitives/Img';

// Rise + 3s hold + fall. Mirrors the expandHint keyframes in
// styles/components/mini-player.css — change both together.
const HINT_MS = 3700;

export default function MiniPlayer() {
  const { track, playing, currentTime, duration, togglePlay, expand, close, expanded } = useMusicPlayer();
  const [hint, setHint] = useState(false);

  // The bar is tappable but doesn't look it, so hint at it — but only when
  // playback starts from nothing. Keying on presence (not identity) keeps it
  // from re-firing on queue auto-advance, where the bar never went away.
  const hasTrack = track !== null;
  useEffect(() => {
    if (!hasTrack) return;
    setHint(true);
    const t = window.setTimeout(() => setHint(false), HINT_MS);
    return () => window.clearTimeout(t);
  }, [hasTrack]);

  // Expanding is the thing the hint was teaching. Once they've done it, drop
  // the hint so a collapse back to the bar can't replay a half-finished one.
  useEffect(() => {
    if (expanded) setHint(false);
  }, [expanded]);

  if (!track || expanded) return null;

  // Same source of truth as the full player's bar — just read-only here.
  // Infinity until the file can be sized, which would leave the fill at 0%.
  const progress =
    Number.isFinite(duration) && duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="mini-player fixed bottom-[60px] left-0 right-0 z-modal-backdrop
                 bg-accent border-t border-border
                 flex items-center gap-sm px-md py-sm cursor-pointer
                 active:opacity-80 transition-base"
      onClick={expand}
    >
      {hint && <div className="expand-hint" aria-hidden="true">Click to expand</div>}

      <Img
        src={track.coverUrl || '/Images/default_song_cover.png'}
        alt={track.title}
        className="w-10 h-10 rounded-sm flex-shrink-0"
      />

      <span className="text-sm font-medium truncate flex-1 text-alt">{track.title}</span>

      <div className="flex items-center flex-shrink-0 ml-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center
                     cursor-pointer active:scale-90 transition-base mr-sm"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" fill="var(--black)" className="w-4 h-4">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="var(--black)" className="w-4 h-4 ml-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          className="w-8 h-8 flex items-center justify-center
                     cursor-pointer active:scale-90 transition-base"
        >
          <img src="/Icons/CloseIcon.PNG" alt="Close" className="w-5 h-5" />
        </button>
      </div>

      {/* Slim non-interactive playback progress — Spotify-style, on the bar's
          bottom edge. Dark fill so it reads against the lime bar. */}
      <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-black/15">
        <div className="h-full bg-black/70" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
