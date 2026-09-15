import { apiFetch } from './client';
import type { Collection, RequestStatus } from './collections';
import type { OpenCallStatus } from './opencall';
import type { Song } from './songs';

/**
 * The one jam read that needs no collection id.
 *
 * **There are no jam writes here.** Starting a jam and naming its winner both
 * moved behind the backend's curation key — a jam is something the label runs,
 * not something an artist's owner makes, and bops decide the winner.
 *
 * Everything else is generic: a jam is fetched with `fetchCollection`, and its
 * lifecycle is `OpenCallStatus` (`./opencall`), which a mixtape shares.
 */

interface CurrentJamResponse {
  success: boolean;
  collection: Collection | null;
  songs: Song[];
  request_status?: RequestStatus;
  open_call_status?: OpenCallStatus;
}

/**
 * The label's current jam, across the whole roster — the one jam read that takes
 * no collection id, and the reason a jam can headline the landing page instead
 * of hiding on whichever artist happens to be hosting.
 *
 * It answers in the exact shape of `fetchCollection`, so the same components
 * render it. Three things to hold onto:
 *
 *   - It returns the most recently *started* jam whatever its phase, so between
 *     events the last one keeps showing rather than the page going blank.
 *   - `songs` is empty for the whole submission window. That's the open call
 *     running, not a failed read.
 *   - Never having run one is a 200 with `collection: null`, not a 404 — a fact
 *     about the label, not an error.
 */
export const fetchCurrentJam = () =>
  apiFetch<CurrentJamResponse>('/slopbop/collections/jams/current').then(r => ({
    collection: r.collection,
    songs: r.songs ?? [],
    requestStatus: r.request_status ?? null,
    openCallStatus: r.open_call_status ?? null,
  }));
