import { useSim } from '../../../context/SimContext';
import { useWorldItems, useWorldMap } from '../../../hooks/sim';
import { StatBar } from './StatBar';
import { Item, Location, SnapshotState } from '../../../services/slopbop';

// The three tracked stats, in display order, each with its own emoji + color.
const STATS: { key: string; emoji: string; color: string }[] = [
  { key: 'Energy',      emoji: '💪', color: 'var(--stat-energy)' },
  { key: 'Focus',       emoji: '🧠', color: 'var(--stat-focus)' },
  { key: 'Inspiration', emoji: '👁', color: 'var(--stat-inspiration)' },
];

function titleCaseSnake(s: string) {
  const spaced = s.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// `busy_until` is a naive sim-local string "YYYY-MM-DDTHH:MM" — take the HH:MM
// part directly, never via new Date().
function formatUntil(simTime: string) {
  return simTime.split('T')[1] ?? simTime;
}

function findLocation(map: Location[] | null, name: string | null): Location | undefined {
  if (!map || !name) return undefined;
  return map.find(l => l.name === name);
}

function ActionRow({ label, busyUntil, emoji, name, prefix = '' }: {
  label: string;
  busyUntil: string | null;
  emoji: string;
  name: string;
  prefix?: string;
}) {
  return (
    <div className="flex flex-col gap-xs">
      <div className="text-sm text-white">
        {label}
        {busyUntil && <span> (until {formatUntil(busyUntil)})</span>}
      </div>
      <p className="text-lg">
        {prefix}<span className="mr-1">{emoji}</span>{name}
      </p>
    </div>
  );
}

function renderActionSection(state: SnapshotState, locationDef: Location | undefined) {
  switch (state.current_action) {
    case null:
      return null;
    case 'move':
      return (
        <ActionRow
          label="Moving to"
          busyUntil={state.busy_until}
          emoji="🚶"
          name={state.current_target ? titleCaseSnake(state.current_target) : '—'}
          prefix="→ "
        />
      );
    case 'interact': {
      const interactionDef =
        locationDef && state.current_target
          ? locationDef.interactions[state.current_target]
          : undefined;
      return (
        <ActionRow
          label="Current Action"
          busyUntil={state.busy_until}
          emoji={interactionDef?.emoji ?? '✨'}
          name={state.current_target ? titleCaseSnake(state.current_target) : '—'}
        />
      );
    }
  }
}

// One carried item — emoji, bold name, then its description inline.
function ItemRow({ item }: { item: Item }) {
  return (
    <p className="text-sm leading-relaxed">
      <span className="mr-1">{item.emoji}</span>
      <span className="font-bold capitalize">{item.name}</span>
      <span className="text-muted"> — {item.description}</span>
    </p>
  );
}

// Live simulation status for one artist: where they are, what they're doing,
// their stats, and the items they carry. Pulled from the current sim
// snapshot — shows a fallback when the artist isn't in a running simulation.
export function ArtistStatus({ artistId }: { artistId: string }) {
  const { sim } = useSim();
  const { map } = useWorldMap();
  const { items: catalogue } = useWorldItems();

  const state: SnapshotState | null = sim?.artists[artistId] ?? null;
  if (!sim || !state) {
    return (
      <p className="text-center text-muted text-sm py-3xl">
        Not part of a running simulation.
      </p>
    );
  }

  const locationDef = findLocation(map, state.location);
  const locationName = locationDef?.name
    ? titleCaseSnake(locationDef.name)
    : (state.location ?? 'Somewhere');
  const locationEmoji = locationDef?.emoji ?? '📍';

  // Resolve the artist's owned item names against the global catalogue.
  // The snapshot stores names lowercased ("notebook"); the catalogue keeps
  // them title-cased ("Notebook") — so match case-insensitively.
  const byName = new Map(
    (catalogue ?? []).map(i => [i.name.toLowerCase(), i]),
  );
  const ownedItems = (state.items ?? [])
    .map(name => byName.get(name.toLowerCase()))
    .filter((i): i is Item => i !== undefined);

  return (
    <div className="flex flex-col gap-xl rounded-lg p-md" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
      {state.current_action !== 'move' && (
        <div className="flex items-baseline gap-sm">
          <span className="text-sm text-white">Location:</span>
          <p className="text-lg">
            <span className="mr-1">{locationEmoji}</span>{locationName}
          </p>
        </div>
      )}

      {renderActionSection(state, locationDef)}

      <div className="flex flex-col gap-sm">
        {STATS.map(({ key, emoji, color }) => (
          <StatBar
            key={key}
            emoji={emoji}
            name={key}
            value={state.stats[key] ?? 0}
            color={color}
          />
        ))}
      </div>

      {ownedItems.length > 0 && (
        <div className="flex flex-col gap-sm">
          <span className="text-sm text-white">Items</span>
          {ownedItems.map(item => (
            <ItemRow key={item.name} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
