import { useState, useCallback } from 'react';
import { useResource } from '../useResource';
import { useRequestWatch } from '../requests/useRequestWatch';
import {
  createVisual,
  rerollDraft,
  fetchDrafts,
  fetchImages,
  saveDraft,
  deleteImage,
  ApiError,
  NOT_YOUR_ARTIST,
} from '../../services/slopbop';

/**
 * The image studio for one artist: the two lists an owner's renders live in, and
 * the four things they do with them.
 *
 * Drafts are unsaved and 24h-lived; images are the ones kept, on Arweave and
 * permanent. They're one hook because every write moves something between them —
 * a render adds a draft, saving moves one across — and splitting them would
 * leave the page wiring that handoff by hand.
 *
 * "Is a render on its way?" is `useRequestWatch`'s problem: it polls the order
 * queue and tells us when the draft has landed.
 */

const FAILED = "That render didn't come back. Nothing was saved — try again.";

export function useImageStudio(artistId: string) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draftsResource = useResource(
    () => fetchDrafts(artistId),
    artistId ? `drafts-${artistId}` : '',
    { onError: () => setError('Could not load your drafts.') },
  );

  const imagesResource = useResource(
    () => fetchImages(artistId),
    artistId ? `images-${artistId}` : '',
    { onError: () => setError('Could not load your gallery.') },
  );

  const drafts = draftsResource.data ?? [];
  const images = imagesResource.data ?? [];
  // Pulled out because the resource objects are new every render; these aren't.
  const { refetch: refetchDrafts } = draftsResource;
  const { refetch: refetchImages } = imagesResource;

  const { waiting, begin, abandon } = useRequestWatch({
    artistId,
    type: 'visual',
    landedIds: draftsResource.data?.map(d => d.image_id) ?? null,
    refetchLanded: refetchDrafts,
    onFailed: () => setError(FAILED),
  });

  /**
   * Shared by both doors. `begin` claims the one-at-a-time slot before the
   * request goes out, so a second press in the same tick is dropped rather than
   * ordering twice.
   */
  const startOrder = useCallback(
    async (place: () => Promise<unknown>, failure: string): Promise<boolean> => {
      if (!artistId || !begin()) return false;
      setError(null);
      try {
        await place();
        return true;
      } catch (err) {
        abandon();
        setError(messageFor(err, failure));
        return false;
      }
    },
    [artistId, begin, abandon],
  );

  /**
   * Order a render from a new prompt. Resolves as soon as the order is accepted
   * — `generating` stays true until the draft shows up, which is the flag the UI
   * should hide the form's button on.
   */
  const create = useCallback(
    (prompt: string) =>
      startOrder(() => createVisual(artistId, prompt), 'Could not start that render.'),
    [artistId, startOrder],
  );

  /** Another go at a draft, which supplies its own prompt. The old one is deleted. */
  const reroll = useCallback(
    (imageId: string) =>
      startOrder(async () => {
        await rerollDraft(imageId);
        // Already gone server-side; show that now rather than leaving a dead
        // card up for a poll cycle.
        refetchDrafts();
      }, 'Could not reroll that draft.'),
    [refetchDrafts, startOrder],
  );

  /**
   * Keep a draft: several seconds of Arweave upload. The draft *becomes* the
   * image, so it leaves one list and joins the other — both are refetched.
   */
  const save = useCallback(
    async (imageId: string): Promise<string | null> => {
      if (saving) return null;
      setSaving(true);
      setError(null);
      try {
        const url = await saveDraft(imageId);
        await Promise.all([refetchDrafts(), refetchImages()]);
        return url;
      } catch (err) {
        setError(messageFor(err, 'Could not save that image.'));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [saving, refetchDrafts, refetchImages],
  );

  /** Throw one away. On a saved image this only drops the record — Arweave keeps it. */
  const discard = useCallback(
    async (imageId: string): Promise<boolean> => {
      setError(null);
      try {
        await deleteImage(imageId);
        await Promise.all([refetchDrafts(), refetchImages()]);
        return true;
      } catch (err) {
        setError(messageFor(err, 'Could not delete that image.'));
        return false;
      }
    },
    [refetchDrafts, refetchImages],
  );

  return {
    drafts,
    draftsLoading: draftsResource.loading,
    images,
    imagesLoading: imagesResource.loading,
    /** True from ordering until the draft lands. */
    generating: waiting,
    saving,
    error,
    create,
    reroll,
    save,
    discard,
    refetch: refetchDrafts,
  };
}

/** The whole studio, for the components a page hands it to. */
export type ImageStudio = ReturnType<typeof useImageStudio>;

function messageFor(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return NOT_YOUR_ARTIST;
    // The session is already gone by now — this only names what was lost.
    if (err.status === 401) return 'Your session expired. Sign in again to keep going.';
    // 400 is the prompt: empty, or past the cap. The server's wording is specific.
    if (err.status === 400 && err.body?.error) return String(err.body.error);
  }
  return fallback;
}
