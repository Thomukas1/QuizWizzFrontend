import { apiFetch } from './client';

export interface SnapshotState {
  location: string | null;
  position: [number, number] | null;
  current_action: 'move' | 'interact' | null;
  current_target: string | null;
  busy_until: string | null;
  stats: Record<string, number>;
  // Names of the items the artist is carrying — resolve against the
  // catalogue from `fetchWorldItems` / `useWorldItems`.
  items: string[];
}

export interface Environment {
  city: string;      // e.g. "Vilnius, Lithuania"
  timezone: string;  // IANA name, e.g. "Europe/Vilnius"
  lat: number;
  lon: number;
}

export interface SimCurrent {
  simulation_id: string;
  date: string;
  weather: string | null;
  sim_time: string;
  // The sim's place — static for its life. Null for old/legacy docs.
  environment: Environment | null;
  status: string;
  artists: Record<string, SnapshotState | null>;
}

export interface Note {
  sim_time: string;
  note: string;
}

export interface JournalPlan {
  type: 'plan';
  sim_time: string;
  plan: string;
}

export interface JournalIntent {
  type: 'intent';
  sim_time: string;
  action: 'move' | 'interact' | 'item';
  target: string;
  intent: string;
  until?: string;
}

export interface JournalInteraction {
  type: 'interaction';
  sim_time: string;
  target: string;
  observation: string;
  outcome: string;
}

// The outcome of using a carried item — same shape as JournalInteraction.
export interface JournalItem {
  type: 'item';
  sim_time: string;
  target: string;
  observation: string;
  outcome: string;
}

export interface JournalArrival {
  type: 'arrival';
  sim_time: string;
  location: string;
}

export type JournalEntry =
  | JournalPlan
  | JournalIntent
  | JournalInteraction
  | JournalItem
  | JournalArrival;

export interface InteractionDef {
  emoji: string;
  description: string;
  flavor?: string[];
  duration_minutes?: number;
  energy_cost?: number;
  skill_use?: string;
}

export interface Location {
  _id: string;
  name: string;
  position: [number, number];
  emoji: string;
  description: string;
  interactions: Record<string, InteractionDef>;
}

export type WorldMap = Location[];

// A portable thing an artist carries and can use anywhere, independent of
// location. Global catalogue entry — an artist's owned items are the
// `items` name list on its `SnapshotState`, resolved against this.
export interface Item {
  name: string;
  emoji: string;
  description: string;
  duration_minutes: number;
  // Signed Energy/Focus/Inspiration deltas applied when the item is used.
  stat_effects: Record<string, number>;
  skill_use?: string;
  tool_use?: string;
}

export type ItemCatalogue = Item[];

interface SimCurrentResponse {
  success: boolean;
  sim: SimCurrent | null;
}

interface SimNotesResponse {
  success: boolean;
  notes: Note[];
}

interface SimJournalResponse {
  success: boolean;
  entries: JournalEntry[];
}

interface WorldMapResponse {
  success: boolean;
  locations: Location[];
}

interface WorldItemsResponse {
  success: boolean;
  items: Item[];
}

export const fetchSimCurrent = () =>
  apiFetch<SimCurrentResponse>('/slopbop/sim/current').then(r => r.sim);

export const fetchSimArtistNotes = (simulationId: string, artistId: string) =>
  apiFetch<SimNotesResponse>(
    `/slopbop/sim/${simulationId}/artist/${artistId}/notes`,
  ).then(r => r.notes);

export const fetchSimArtistJournal = (simulationId: string, artistId: string) =>
  apiFetch<SimJournalResponse>(
    `/slopbop/sim/${simulationId}/artist/${artistId}/journal`,
  ).then(r => r.entries);

export const fetchWorldMap = () =>
  apiFetch<WorldMapResponse>('/slopbop/sim/world/map').then(r => r.locations);

export const fetchWorldItems = () =>
  apiFetch<WorldItemsResponse>('/slopbop/sim/world/items').then(r => r.items);

// Today's date ("YYYY-MM-DD") as it reads on a wall clock in `timezone`.
export function todayInTz(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(
    new Date(),
  );
}

// "Is this sim still live" — derived from today *in the sim's timezone*, since
// near midnight that disagrees with the browser's local zone / UTC.
export function isSimLive(sim: SimCurrent | null): boolean {
  if (!sim) return false;
  const tz = sim.environment?.timezone;
  const today = tz
    ? todayInTz(tz)
    : new Date().toISOString().slice(0, 10); // legacy doc: no environment
  return sim.date === today;
}
