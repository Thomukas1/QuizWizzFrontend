import { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Field } from '../../../../primitives/form';
import Img from '../../../../primitives/Img';
import ImagePicker from '../../../../components/ImagePicker';
import { useCollections, useCreateAlbum } from '../../../../hooks/collections';
import { useToast } from '../../../../context/ToastContext';
import { ALBUM_TITLE_MAX, ALBUM_TRACKS_MIN, type Collection } from '../../../../services/slopbop';

interface Props {
  artistId: string;
  /** Close the studio. Called once the album exists and we're leaving for it. */
  onDone: () => void;
}

/**
 * The longest album this form offers. The contract allows up to
 * `ALBUM_TRACKS_MAX` (15) — this is deliberately shorter, because every track is
 * a song the artist still has to write, and the count is a promise they can't
 * walk back except by deleting the album. The floor is the contract's, since
 * there's no reason to offer less than the shortest album allowed.
 */
const TRACKS_OFFERED_MAX = 12;

/** Where the slider lands before anyone touches it — a full-length album. */
const TRACKS_DEFAULT = 10;

/**
 * The owner starting an album. Title, cover, length — and then it exists, empty,
 * waiting to be filled a track at a time.
 *
 * **Every field here is a commitment**, which is what separates this from the
 * jam creator next door. A jam derives everything server-side and runs on a
 * clock; an album is authored, and the length set here is what it has to reach
 * before it can be released at all. So the form says so in as many words, next
 * to the control that sets it.
 *
 * The cover comes from the image studio's gallery rather than an upload: those
 * are already on Arweave, and creation stores a link — it will not take the
 * inline bytes of an unsaved draft. Picking one *stages* it; nothing is written
 * until Create, and leaving the tool discards it.
 *
 * On success this leaves for the album: a brand new one is empty, and the only
 * thing to do with it is write the first track, which happens there.
 */
export default function AlbumCreator({ artistId, onDone }: Props) {
  // An artist may have one unfinished album at a time — the create endpoint
  // refuses a second and hands back the one that exists. Reading the shelf here
  // turns that refusal into something the owner can act on *before* filling in a
  // form that was never going to be accepted. It costs a request, and only when
  // this tool is opened: the shell renders no page until it's the one showing.
  const { collections: albums, loading } = useCollections(artistId, 'album');
  const unfinished = albums.find(album => album.released_at == null);

  if (loading) return <div className="spinner large processing" />;
  if (unfinished) return <UnfinishedNotice album={unfinished} onLeave={onDone} />;

  return <CreateForm artistId={artistId} onDone={onDone} />;
}

/**
 * What the owner gets instead of the form while an album is still open. Not a
 * disabled Create with an explanation beside it: the album in the way is also
 * the only thing that can clear it, and filling it, releasing it and deleting it
 * are all done on its own page — so the one control here goes there.
 */
function UnfinishedNotice({ album, onLeave }: { album: Collection; onLeave: () => void }) {
  const navigate = useNavigate();
  const written = album.submission_count ?? 0;
  const total = album.max_tracks ?? 0;

  return (
    <div className="flex flex-col gap-md">
      <p className="text-sm text-muted leading-relaxed">
        “{album.title || 'Untitled'}” isn't finished — {written} of {total} songs
        written. An artist works on one album at a time, so this one has to be
        released or deleted before another can start.
      </p>
      <button
        type="button"
        className="secondary full-width"
        onClick={() => {
          onLeave();
          navigate(`/albums/${album._id}`);
        }}
      >
        Open the album
      </button>
    </div>
  );
}

// Split from the tool above so the form's state is born after the shelf has been
// read: nothing can be typed into a form that was never going to be submitted,
// and there's no draft to reset when the notice stands in its place.
function CreateForm({ artistId, onDone }: Props) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { create, creating, fieldErrors } = useCreateAlbum();
  const tracksId = useId();

  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [maxTracks, setMaxTracks] = useState(TRACKS_DEFAULT);
  const [picking, setPicking] = useState(false);

  const handleCreate = async () => {
    const outcome = await create({
      artist_id: artistId,
      title,
      cover_url: coverUrl,
      max_tracks: maxTracks,
    });

    if (outcome.ok) {
      onDone();
      navigate(`/albums/${outcome.album.collection_id}`);
      return;
    }

    // Field errors are already on the inputs — there's nothing a toast could add
    // that the form isn't showing.
    if (outcome.kind === 'invalid') return;

    // An album was started elsewhere while this form was open — a second tab,
    // another device. The useful answer is that album, not the news of it.
    if (outcome.kind === 'existing') {
      showToast(outcome.message, 'warning');
      onDone();
      navigate(`/albums/${outcome.albumId}`);
      return;
    }

    showToast(outcome.message);
  };

  return (
    <>
      <TextField
        label="Title"
        value={title}
        onChange={setTitle}
        maxLength={ALBUM_TITLE_MAX}
        error={fieldErrors.title}
        placeholder="Name the record."
        required
      />

      {/* The cover leads, at the size it'll be seen at — an album is a square
          before it's anything else. Empty, it's the same placeholder every
          coverless record wears, so the gap reads as a cover that isn't chosen
          yet rather than as a broken image. */}
      <div className="flex flex-col items-center gap-md">
        <Img
          src={coverUrl || '/Images/default_song_cover.png'}
          alt={coverUrl ? 'The album cover you chose' : 'No cover chosen yet'}
          className={`w-48 aspect-square rounded-md border-sm ${
            coverUrl ? 'border-accent' : 'border-border'
          }`}
        />
        {/* White, not accent: Create is the accent in this box, and choosing a
            cover is a step on the way to it. Re-openable — picking again just
            replaces what's staged. */}
        <button type="button" onClick={() => setPicking(true)} className="primary">
          {coverUrl ? 'Change image' : 'Select image'}
        </button>
        {fieldErrors.cover_url && <p className="field-error">{fieldErrors.cover_url}</p>}
      </div>

      <Field
        label="Length"
        htmlFor={tracksId}
        help={`${maxTracks} songs`}
        error={fieldErrors.max_tracks}
      >
        <div className="flex items-center gap-md">
          <span className="text-xs text-muted">{ALBUM_TRACKS_MIN}</span>
          <input
            id={tracksId}
            type="range"
            className="slider"
            min={ALBUM_TRACKS_MIN}
            max={TRACKS_OFFERED_MAX}
            step={1}
            value={maxTracks}
            onChange={e => setMaxTracks(Number(e.target.value))}
          />
          <span className="text-xs text-muted">{TRACKS_OFFERED_MAX}</span>
        </div>
      </Field>

      {/* Under the slider on purpose — this is the one thing on the form that
          can't be changed afterwards, so it's read while the number is being
          chosen rather than after. */}
      <p className="text-xs text-muted leading-relaxed -mt-md">
        This is a commitment. The album stays unfinished until all {maxTracks} songs
        are written, and only then can it be released. Until it is, this artist
        can't start another one — the way out is to finish it or delete it.
      </p>

      {fieldErrors.form && <p className="field-error">{fieldErrors.form}</p>}

      {/* `special`, like every other terminal form action in the app. */}
      <button
        type="button"
        onClick={handleCreate}
        disabled={creating}
        className="special full-width"
      >
        {creating ? 'Creating…' : 'Create'}
      </button>

      {/* Portals to the body like every Modal, so living inside the studio's box
          doesn't stop it painting over it. Picking closes it and stages the url;
          Create still writes. */}
      <ImagePicker
        open={picking}
        onClose={() => setPicking(false)}
        artistId={artistId}
        selectedUrl={coverUrl}
        title="Choose a cover"
        onPick={url => {
          setCoverUrl(url);
          setPicking(false);
        }}
      />
    </>
  );
}
