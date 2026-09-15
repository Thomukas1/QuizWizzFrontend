import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatorStudio from './CreatorStudio';
import ProfileEditor from './ProfileEditor';
import type { Artist } from '../../../services/slopbop';

interface Props {
  /**
   * The server's answer for the session that asked, straight from `useArtist` —
   * never a client-side comparison against `owner_id`. It's a rendering hint,
   * so everything gated on it is UI only; the endpoints behind these actions do
   * their own checking.
   */
  isOwner: boolean;
  /**
   * The artist these actions act on — whatever profile they're overlaid on. The
   * whole document rather than its id, because the editor opens on the fields
   * this page has already read.
   */
  artist: Artist;
  /** Re-read the artist, after an action here changed it. */
  onUpdated: () => void;
}

/**
 * The owner's controls overlaid on the artist hero, balancing the back button
 * across from them. Self-gating: renders nothing for anyone who doesn't own this
 * artist, so the profile can drop it in unconditionally.
 *
 * Create opens the creator studio, the palette opens the image studio, and the
 * pencil opens the profile editor. Create wears lime because it's the one thing
 * on the page only you can do; the rest stay in the back button's black, since
 * they're chrome rather than the point.
 *
 * This folder is where owner-only surfaces go. Anything that appears *because*
 * you own the artist belongs here rather than in the shared profile components,
 * so the ownership boundary stays visible in the file tree.
 */
export default function OwnerActions({ isOwner, artist, onUpdated }: Props) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const artistId = artist.artist_id;

  if (!isOwner) return null;

  return (
    <div className="absolute top-lg right-lg z-10 flex items-center gap-sm">
      <button
        type="button"
        onClick={() => setCreating(true)}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-accent text-alt active:opacity-70 transition-opacity"
        aria-label="Open the creator studio"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>

      {/* The one action here that leaves the page. An emoji rather than an icon
          because it's the only colour in the row, which is what tells you the
          gallery is a place and not another control. */}
      <button
        type="button"
        onClick={() => navigate(`/artists/${artistId}/studio`)}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-black/70 p-0 text-xl leading-none active:opacity-70 transition-opacity"
        aria-label="Open the image studio"
      >
        <span aria-hidden="true">🎨</span>
      </button>

      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-black/70 text-white active:opacity-70 transition-opacity"
        aria-label="Edit profile"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
        </svg>
      </button>

      {/* Both portal to the body, so they don't inherit the hero's stacking or
          the absolute positioning above. */}
      <CreatorStudio
        open={creating}
        onClose={() => setCreating(false)}
        artistId={artistId}
      />

      <ProfileEditor
        open={editing}
        onClose={() => setEditing(false)}
        artist={artist}
        onSaved={onUpdated}
      />
    </div>
  );
}
