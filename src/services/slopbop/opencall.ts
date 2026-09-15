// The open call — the lifecycle both crowdsourced collection types run on. A
// window opens, anyone submits against it, it shuts, and the songs are produced
// and released one at a time. A jam and a mixtape differ only at the end of it,
// and that difference is `selected_song_id`.
//
// Returned as `open_call_status` (was `jam_status`, and jam-only) on collection
// detail, `jams/current`, the jam standings read, and the 409s from create and
// resolve.

// Where an open call is in its life. Derived server-side from the clock, never
// stored. Not the same question as `RequestStatus.open`: that's "can I submit
// right now", this is where the event has got to. One that filled early is shut
// to submissions while still in its `open` phase.
export type OpenCallPhase =
  // Exists, hasn't opened. Count down to `submission_start`.
  | 'scheduled'
  // Inside the window. Whether songs exist yet is the collection's `drain`: a
  // `batch` call produces nothing until it shuts (`songs: []` for the whole
  // phase), an `instant` one lands tracks as they're written.
  | 'open'
  // Shut, and the tracks landing one at a time as unreleased songs with future
  // `release_date`s — `SongList`'s countdown-card path.
  | 'awaiting_resolution'
  // Settled: a jam named a winner, a mixtape ran its release out. Terminal.
  | 'resolved'
  // The window ran out with nobody entering. Rare, and terminal.
  | 'closed';

export interface OpenCallStatus {
  phase: OpenCallPhase;
  submission_start: string | null;
  /** When submissions shut — and when the songs start landing. */
  submission_deadline: string | null;
  /** Null until `resolved`. */
  resolved_at: string | null;
  // **Jam-only**, absent on a mixtape. Promotion clears the winner's
  // `collection_id` and deletes the also-rans, so a resolved jam reads back
  // `songs: []` — fetch the winner by this id with `fetchSong`.
  selected_song_id?: string | null;
}
