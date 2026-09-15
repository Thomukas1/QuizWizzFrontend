import { useState, useEffect } from 'react';
import { Modal } from '../../../primitives/Modal';
import { TextAreaField } from '../../../primitives/form';
import Img from '../../../primitives/Img';
import ImagePicker from '../../../components/ImagePicker';
import { useUpdateArtist } from '../../../hooks/artists';
import { useToast } from '../../../context/ToastContext';
import type { Artist, ArtistUpdate } from '../../../services/slopbop';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The artist being edited, as the profile already read it — the form's starting values. */
  artist: Artist;
  /** Re-read the artist. The profile behind the modal is showing the old copy. */
  onSaved: () => void;
}

// The backend's registry caps the bio at 300; matching it here means the limit
// is felt while typing instead of arriving as a 400 after Save.
const BIO_MAX = 300;

/**
 * The owner editing their own profile. One modal, one Save, and a patch built
 * from what actually changed — the contract treats an absent key as untouched,
 * so a field this form never showed can't be blanked by saving.
 *
 * The picture comes from the image studio's gallery rather than an upload: those
 * are already on Arweave, which is the http(s) url the field wants, and it means
 * the profile can only ever wear something this artist actually rendered. Picking
 * one *stages* it — nothing is written until Save, so the picture and the bio go
 * up in one patch and backing out of the modal changes nothing.
 */
export default function ProfileEditor({ open, onClose, artist, onSaved }: Props) {
  const { showToast } = useToast();
  const { save, saving, error } = useUpdateArtist();
  const [bio, setBio] = useState(artist.bio ?? '');
  const [imageUrl, setImageUrl] = useState(artist.image_url ?? '');
  const [picking, setPicking] = useState(false);

  // Seed on the way *in*, so reopening shows the saved document rather than the
  // draft from last time — and so the box can animate closed still showing what
  // was typed, instead of flashing the old values back for 250ms.
  useEffect(() => {
    if (!open) return;
    setBio(artist.bio ?? '');
    setImageUrl(artist.image_url ?? '');
    setPicking(false);
  }, [open, artist.bio, artist.image_url]);

  // `save` clears `error` at the start of every attempt, so this fires once per
  // failure, including two identical ones in a row.
  useEffect(() => {
    if (error) showToast(error);
  }, [error, showToast]);

  const handleSave = async () => {
    const patch: ArtistUpdate = {};
    if (bio !== (artist.bio ?? '')) patch.bio = bio;
    if (imageUrl !== (artist.image_url ?? '')) patch.image_url = imageUrl;

    // Sent even when nothing changed: an empty patch is a legal no-op that still
    // answers with the artist, which keeps Save one unconditional call.
    const updated = await save(artist.artist_id, patch);
    if (!updated) return; // failed (toast above) or a suppressed double-fire

    showToast('Profile updated successfully', 'success');
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile">
      <div className="flex flex-col gap-lg overflow-y-auto p-xl">
        <h2 className="font-display text-lg uppercase tracking-wide">Edit Profile</h2>

        <div className="flex items-center gap-lg">
          {/* The staged url, not the artist's — the preview is what Save would
              write, so a pick is visible before it's committed. */}
          <Img
            src={imageUrl || '/Images/mystery-actor.png'}
            alt={artist.name}
            className="w-24 h-24 shrink-0 rounded-full"
            imgClassName="object-cover object-[center_50%]"
          />
          {/* White rather than accent: Save is the accent in this box, and
              choosing a picture is a step on the way to it, not the commit. */}
          <button type="button" onClick={() => setPicking(true)} className="primary">
            Change image
          </button>
        </div>

        <TextAreaField
          label="Bio"
          value={bio}
          onChange={setBio}
          maxLength={BIO_MAX}
          rows={5}
          placeholder="Tell people who you are."
        />

        {/* Right-aligned and ordinary, like every other confirming action in the
            app (About's "Learn more"). Not `special`: that's for a form's one
            terminal, unrepeatable act — editing a profile is neither. */}
        <div className="flex justify-end">
          <button type="button" onClick={handleSave} disabled={saving} className="secondary">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Over this modal rather than inside it: both portal to the body, and the
          later one paints on top, so the form stays put underneath while the
          picker is up. Picking closes it and stages the url — Save still writes. */}
      <ImagePicker
        open={picking}
        onClose={() => setPicking(false)}
        artistId={artist.artist_id}
        selectedUrl={imageUrl}
        onPick={url => {
          setImageUrl(url);
          setPicking(false);
        }}
      />
    </Modal>
  );
}
