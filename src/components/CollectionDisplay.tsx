import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import type { Collection, CollectionType, ArtistIdentity } from '../services/slopbop';
import Img from '../primitives/Img';
import { qrLogoSettings } from '../primitives/qr';

// The frame of reference for the logo's size, not a rendered dimension — the
// SVG is stretched to the cover by `className` and scales off its viewBox. It
// has to be handed to both props or they disagree; see `primitives/qr.ts`.
const QR_SIZE = 256;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// What each kind calls itself in the credit line. Read off `collection.type`
// rather than taken as a prop, so a page can't label a jam "Mixtape" — and so a
// fourth `CollectionType` shows up here as a type error rather than as a page
// that silently says the wrong word.
const KIND_LABEL: Record<CollectionType, string> = {
  album: 'Album',
  mixtape: 'Mixtape',
  jam: 'Jam',
};

/**
 * The head of a collection page: square cover, title, and the "<Kind> by
 * <artist> | <date>" credit line. Identical on all three collection pages by
 * design — a mixtape, a jam and an album differ in what's *under* this (open
 * calls, deadlines, a winner), never in how they introduce themselves.
 *
 * `released_at` is the only date any of them shows. It's absent on an unreleased
 * album and present everywhere else — see the field's note on `Collection` for
 * why there's no fallback to `created_at`.
 *
 * The cover also carries a `QR` toggle that swaps the artwork for a code
 * pointing at the page you're already on, so a host can put a collection on a
 * screen and let a room scan instead of typing a URL off it. What the scan is
 * *for* differs by kind — a way in to write, on a mixtape or jam; the shortest
 * route from a cover to the record playing on your own phone, on an album — but
 * the affordance is the same one, which is why it isn't gated on type.
 *
 * Not to be confused with `api/stickers/_generate-qr.mjs`, which builds the
 * printed codes. That generator answers to walls — a baked-in 4-module quiet
 * zone, millimetres, and a `/go/<slug>` indirection so a sticker can be
 * re-pointed after it's stuck down. None of that applies to a code that lives
 * for a few seconds on a screen at arm's length and encodes the URL directly.
 * Same library, deliberately different settings — what the two share is the
 * logo (from `primitives/qr.ts`) and navy-on-white, which is the highest
 * contrast pairing in the palette either way.
 *
 * **Dark on light, never inverted** — plenty of scanners refuse a light-on-dark
 * QR outright, so the white here is the code's own background and not a
 * decision about the surrounding page.
 *
 * Level H is not a preference here either. `excavate` blanks the modules under
 * the logo, and M's ~15% damage budget won't cover it — a code on M with a logo
 * punched through scans on the phone you tested with and fails on the next one.
 */
export default function CollectionDisplay({
  collection,
  artist,
}: {
  collection: Collection;
  artist?: ArtistIdentity | null;
}) {
  const [showQR, setShowQR] = useState(false);

  return (
    <>
      <div className="relative w-full aspect-square">
        {showQR ? (
          <div className="w-full h-full flex items-center justify-center bg-white p-lg">
            <QRCodeSVG
              value={window.location.href}
              level="H"
              marginSize={2}
              size={QR_SIZE}
              bgColor="var(--white)"
              fgColor="var(--black)"
              imageSettings={qrLogoSettings(QR_SIZE)}
              className="w-full h-full"
            />
          </div>
        ) : (
          <Img
            src={collection.cover_url || '/Images/default_song_cover.png'}
            alt={collection.title}
            className="w-full h-full"
          />
        )}
        <button
          type="button"
          onClick={() => setShowQR(v => !v)}
          aria-pressed={showQR}
          aria-label="Toggle QR code"
          className={`absolute top-sm right-sm rounded px-xs text-xs font-bold transition-colors ${
            showQR ? 'text-accent' : 'text-white/40 hover:text-white/80'
          }`}
        >
          QR
        </button>
      </div>

      <div className="flex flex-col gap-xs p-lg">
        <h1 className="font-display text-xl">{collection.title || 'Untitled'}</h1>
        <p className="text-sm ml-md">
          {KIND_LABEL[collection.type]} by{' '}
          <Link
            to={`/artists/${artist?.artist_id}`}
            className="underline"
          >
            {artist?.name ?? 'Unknown'}
          </Link>
          {collection.released_at && <> | {formatDate(collection.released_at)}</>}
        </p>
      </div>
    </>
  );
}
