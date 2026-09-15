import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { useSongBop } from '../hooks/songs';
import Img from '../primitives/Img';
import { fetchArweave } from '../services/arweave';

// Guarded because a media element reports `duration` as Infinity until it can
// size the file, which on a chunked response is not immediately — and unguarded
// that renders as "Infinity:NaN".
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function safeFilename(title: string): string {
  const cleaned = title.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
  return `${cleaned || 'song'}.mp3`;
}

// Some lyrics land in the DB with literal escape sequences ("\n", "\r\n", "\t")
// instead of real whitespace — usually a bad lyrics.txt write upstream. Convert
// them back to real characters so `whitespace-pre-line` can break on them.
function normalizeLyrics(lyrics: string): string {
  return lyrics.replace(/\\r\\n|\\n|\\r/g, '\n').replace(/\\t/g, '\t');
}

// Split lyrics into structural tags ([Verse], [Chorus - whispered], …) and the
// sung lines, so the tags recede (muted) while the words pop in sage.
function renderLyrics(text: string) {
  return text.split(/(\[[^\]]*\])/g).map((part, i) =>
    /^\[[^\]]*\]$/.test(part) ? (
      <span key={i} className="subtle">{part}</span>
    ) : (
      part
    ),
  );
}

export default function MusicPlayer() {
  const {
    track,
    playing,
    loading,
    currentTime,
    duration,
    expanded,
    togglePlay,
    seek,
    skip,
    next,
    prev,
    hasNext,
    hasPrev,
    collapse,
  } = useMusicPlayer();

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => seek(Number(e.target.value)),
    [seek],
  );

  const [downloading, setDownloading] = useState(false);

  // Held here rather than inside ArtistNote so it survives the queue advancing:
  // opening the panel is a statement about wanting to read the notes, not about
  // one song, so the next song's note is already open when it arrives.
  const [noteOpen, setNoteOpen] = useState(false);

  // Keep the sheet mounted for the slide-down: `expanded` flips to false the
  // instant the arrow is tapped, but we hold the element in the DOM (rendered)
  // until its exit animation finishes, then unmount on animationEnd below.
  const [rendered, setRendered] = useState(false);
  useEffect(() => {
    if (expanded) setRendered(true);
  }, [expanded]);

  // Songs are free to use — pull the file cross-origin (gateway allows it)
  // and hand the user a real download with a sensible filename. Falls back
  // to opening the URL if the fetch is blocked.
  const handleDownload = useCallback(async () => {
    if (!track || downloading) return;
    setDownloading(true);
    try {
      const res = await fetchArweave(track.audioUrl);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = safeFilename(track.title);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(track.audioUrl, '_blank', 'noopener');
    } finally {
      setDownloading(false);
    }
  }, [track, downloading]);

  if (!track || (!expanded && !rendered)) return null;

  // Whitespace-only is no note — it would otherwise draw an empty panel.
  const note = track.note?.trim();

  // Infinity would make the fill 0% and the scrubber span a length that isn't
  // the song's, so treat an unknown duration as "no seek bar yet".
  const knownDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const progress = knownDuration > 0 ? (currentTime / knownDuration) * 100 : 0;

  return (
    <div
      className={`music-player-sheet fixed inset-0 z-modal bg-black overflow-y-auto overflow-x-hidden ${
        expanded ? 'is-open' : 'is-closing'
      }`}
      onAnimationEnd={(e) => {
        // Ignore bubbled animations from children (spinners, bop-meter) — only
        // the sheet's own slide-down should trigger the unmount.
        if (e.target === e.currentTarget && !expanded) setRendered(false);
      }}
    >
      {/* Minimize handle — same lime as the MiniPlayer this collapses back
          into, so it reads unmistakably as "tap here to go back down". The
          whole strip is the tap target, and it's sticky so it stays reachable
          after scrolling through long lyrics. */}
      <button
        type="button"
        onClick={collapse}
        className="sticky top-0 z-10 w-full rounded-none bg-accent text-alt flex items-center justify-end gap-xs
                   py-sm px-lg cursor-pointer active:opacity-80 transition-base"
      >
        <span className="text-xs font-bold uppercase tracking-wider">press to minimize</span>
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
        </svg>
      </button>

      {/* Wraps everything below the handle so the base glow can anchor to the
          bottom of the player's *content*. Anchoring it to the sheet wouldn't
          work — the sheet is the scroll container, so an absolute layer there
          pins to the visible box and scrolls away instead of sitting at the end. */}
      <div className="music-player-body">
      <div className="music-player-stars" aria-hidden="true" />
      {/* Content column — constrained to the cover's width and centered, so
          on desktop the meta/controls don't sprawl to the screen edges. */}
      <div className="mx-auto w-full max-w-player px-lg pt-3xl">
        {/* Artist (left) + download (right) — above the cover */}
        <div className="flex items-center justify-between gap-md mb-md">
        {track.artistId && track.artistName ? (
          <Link
            to={`/artists/${track.artistId}`}
            onClick={collapse}
            className="text-sm subtle underline truncate"
          >
            by {track.artistName}
          </Link>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          aria-label="Download song"
          className="flex-shrink-0 cursor-pointer active:scale-90 transition-base disabled:opacity-50"
        >
          {downloading ? (
            <svg viewBox="0 0 24 24" className="w-7 h-7 animate-spin" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
              <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-7"
            >
              <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
              <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
          )}
        </button>
      </div>

        {/* Cover art — the glow behind it is a ::before on the wrapper, so the
            halo bleeds past the artwork's edges and lifts it off the flat bg. */}
        <div className="song-cover-glow">
          <Img
            src={track.coverUrl || '/Images/default_song_cover.png'}
            alt={track.title}
            className="w-full aspect-square rounded-lg"
          />
        </div>

        {/* Title — centered under the cover */}
        <p className="mt-lg text-center text-2xl font-bold truncate">{track.title}</p>
      </div>

      {/* Controls + slider — full screen width */}
      <div className="flex flex-col gap-md px-xl py-xl">
        {/* The queue stickers sit absolutely at the row's edges rather than in
            the flow, so the transport trio stays dead-centre whether one, both
            or neither is showing. */}
        <div className="relative flex items-center justify-center gap-3xl">
          {hasPrev && (
            <button
              type="button"
              onClick={prev}
              aria-label="Previous song"
              className="queue-sticker queue-sticker-prev absolute left-0"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M11.5 12l7-6.5v13zM4.5 12l7-6.5v13z" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={() => skip(-15)}
            className="subtle text-sm font-bold cursor-pointer active:scale-90 transition-base"
          >
            -15s
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-white flex items-center justify-center cursor-pointer
                       active:scale-90 transition-base"
          >
            {loading ? (
              <svg viewBox="0 0 24 24" className="w-7 h-7 animate-spin" fill="none">
                <circle cx="12" cy="12" r="9" stroke="var(--black)" strokeWidth="2" strokeOpacity="0.25" />
                <path d="M12 3a9 9 0 0 1 9 9" stroke="var(--black)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : playing ? (
              <svg viewBox="0 0 24 24" fill="var(--black)" className="w-7 h-7">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="var(--black)" className="w-7 h-7 ml-1">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => skip(15)}
            className="subtle text-sm font-bold cursor-pointer active:scale-90 transition-base"
          >
            +15s
          </button>

          {hasNext && (
            <button
              type="button"
              onClick={next}
              aria-label="Next song"
              className="queue-sticker queue-sticker-next absolute right-0"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M12.5 12l-7 6.5v-13zM19.5 12l-7 6.5v-13z" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-col gap-xs">
          <div
            className="music-player-progress"
            style={{ '--progress': `${progress}%` } as React.CSSProperties}
          >
            <input
              type="range"
              min={0}
              max={knownDuration}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              // Nothing to seek within until the length is known — otherwise the
              // thumb walks a range that isn't the song's.
              disabled={knownDuration === 0}
              className="music-player-slider"
            />
          </div>
          <div className="flex justify-between text-xs subtle">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <BopMeter />

      {/* Lyrics — centered column (aligned with the content above), but the
          text itself stays left-aligned. The artist's note folds up underneath,
          in the same column. Both arrive with the release, so an unreleased
          song has neither and this whole section is absent. */}
      {(track.lyrics || note) && (
        <div className="mx-auto w-full max-w-player px-lg pb-3xl">
          {track.lyrics && (
            <>
              <div className="flex items-center justify-between gap-md mb-xl">
                <h3 className="font-display text-xl">Lyrics</h3>
                {track.author && (
                  <div className="text-right text-sm subtle min-w-0">
                    <div>Written by</div>
                    <div className="font-bold text-soft truncate">{track.author}</div>
                  </div>
                )}
              </div>
              <p className="text-sm text-soft whitespace-pre-line leading-relaxed">
                {renderLyrics(normalizeLyrics(track.lyrics))}
              </p>
            </>
          )}
          {note && (
            <ArtistNote note={note} open={noteOpen} onToggle={() => setNoteOpen(o => !o)} />
          )}
        </div>
      )}
      </div>
    </div>
  );
}

// The artist's word on how the song came about, folded away under the lyrics —
// it's the footnote to the words, not a second set of them, so it opens on a
// press rather than on arrival. Controlled, because the player owns whether
// it's open (see `noteOpen`). Rendered as plain text on purpose: the note is
// model-generated prose the backend stores verbatim, so React's escaping is the
// only thing standing between a stray `<script>` and the page.
function ArtistNote({
  note,
  open,
  onToggle,
}: {
  note: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="artist-note">
      <button type="button" onClick={onToggle} aria-expanded={open} className="artist-note-toggle">
        <span>Artist's Notes</span>
        <span className="artist-note-chevron" aria-hidden="true">▾</span>
      </button>
      {/* Two elements, not one: the outer div is the grid row that animates,
          the inner one does the clipping. Padding on the clipped element itself
          would still occupy its 16px while collapsed. */}
      <div className={`artist-note-body ${open ? 'open' : ''}`}>
        <div className="artist-note-clip">
          <p>{note}</p>
        </div>
      </div>
    </div>
  );
}

// The bop strip shown inside the expanded player. One-sided on purpose: slop is
// every song's default state, not a thing you pick — the only move is bopping
// one out of it. So this is an action, not a question, and there's nothing to
// press once you've made it.
function BopMeter() {
  const { track } = useMusicPlayer();
  const { bops, bopped, bopping, bop } = useSongBop(track?.id, track?.bops);

  if (!track) return null;

  return (
    <div className="bop-meter-strip relative overflow-hidden py-xl my-md">
      <div className="bop-meter-bg absolute inset-0 -z-10" />

      <div className="flex flex-col items-center gap-sm px-xl relative">
        {/* No unit — the button underneath says what's being counted. */}
        <p className="font-display text-3xl">
          {bops} 🤩
        </p>

        <button
          type="button"
          disabled={bopped || bopping}
          onClick={bop}
          className={`w-full max-w-player py-sm rounded-lg font-bold text-sm transition-base
            ${bopped
              ? 'bg-surface text-muted cursor-not-allowed'
              : 'bg-accent text-black cursor-pointer active:scale-95'
            }`}
        >
          {bopped ? 'BOPPED' : "THAT'S A BOP!"}
        </button>
      </div>
    </div>
  );
}
