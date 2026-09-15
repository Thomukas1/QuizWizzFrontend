import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ButtonGroup, type ButtonGroupOption } from '../../primitives/form';
import { useArtist } from '../../hooks/artists';
import { useImageStudio } from '../../hooks/visuals';
import { useToast } from '../../context/ToastContext';
import Gallery from './Gallery';
import Creator from './Creator';

/**
 * The image studio: everything an artist's owner renders, on a page of its own.
 *
 * A page rather than a corner of the create modal, because this is somewhere you
 * *stay* — browse what you've kept, write a prompt, look at what came back,
 * reroll — and a modal is somewhere you pass through.
 *
 * `/artists/:id/studio` sits under the artist deliberately: it's one artist's
 * work, and the URL that produced it. There's no owner-scoped route in this app
 * — the owner sees more at the same address, they don't go somewhere private.
 *
 * The gate below is UI only. Every visuals endpoint is owner-checked server-side,
 * so a stranger typing this URL gets 403s regardless; this just means they get a
 * sentence instead of a broken page.
 */
export default function ImageStudioPage() {
  const { id } = useParams<{ id: string }>();
  const artistId = id ?? '';
  // `isOwner` is the server's answer for the session that asked, and `useArtist`
  // keys its cache on the session — so signing in refetches rather than leaving
  // a page that still thinks you're a stranger.
  const { artist, isOwner, loading } = useArtist(artistId);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner large processing" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Artist not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg p-lg">
      <div className="flex items-center gap-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-surface-2
                     p-0 text-white active:opacity-70 transition-opacity"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        <div className="flex flex-col">
          <h1 className="font-display text-lg uppercase tracking-wide">Image Studio</h1>
          <span className="text-xs text-muted">{artist.name}</span>
        </div>
      </div>

      {/* The tool only mounts for the owner, so a stranger's visit makes no
          owner-gated request at all rather than a fan of 403s. */}
      {isOwner ? (
        <Studio artistId={artistId} />
      ) : (
        <p className="text-sm text-muted leading-relaxed">
          The image studio belongs to whoever manages this artist.{' '}
          <Link to={`/artists/${artistId}`} className="text-accent">
            Back to {artist.name}
          </Link>
          .
        </p>
      )}
    </div>
  );
}

type Tab = 'gallery' | 'create';

// Gallery first, and the default: what you have is the reason to be here, and
// making another is the thing you do about it. The `+` is what says the second
// one is an action rather than a second thing to look at.
const TABS: ButtonGroupOption<Tab>[] = [
  { value: 'gallery', label: 'Gallery' },
  { value: 'create', label: '+ Create' },
];

/**
 * Both halves of the studio and the one hook behind them.
 *
 * The hook lives here rather than in each tab because they share a state — a
 * saved draft leaves the creator and appears in the gallery — and two calls
 * would be two copies of it, each unaware of the other's writes. Switching tabs
 * is a swap of what's rendered, not a reload: nothing is refetched, and a render
 * in flight keeps being watched from either side.
 */
function Studio({ artistId }: { artistId: string }) {
  const studio = useImageStudio(artistId);
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('gallery');

  // `error` is display-ready, and the hook clears it at the start of every
  // attempt — so two identical failures in a row both surface.
  useEffect(() => {
    if (studio.error) showToast(studio.error);
  }, [studio.error, showToast]);

  return (
    <>
      <ButtonGroup options={TABS} value={tab} onChange={setTab} />

      {tab === 'gallery' ? (
        <Gallery
          images={studio.images}
          loading={studio.imagesLoading}
          onDelete={studio.discard}
        />
      ) : (
        <Creator studio={studio} />
      )}
    </>
  );
}
