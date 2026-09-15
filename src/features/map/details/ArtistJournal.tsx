import { useSimArtistJournal, useWorldItems, useWorldMap } from '../../../hooks/sim';
import { ItemCatalogue, JournalEntry, Location } from '../../../services/slopbop';

interface Props {
  simulationId: string;
  artistId: string;
  // Poll for new entries while the journal tab is showing.
  live: boolean;
}

// Name → emoji lookups. Journal entries only carry a target's name, so its
// emoji is resolved by key — case-insensitively, since snapshot names are
// lowercased while the catalogues keep them title-cased.
function buildInteractionEmoji(map: Location[] | null): Record<string, string> {
  const emoji: Record<string, string> = {};
  for (const loc of map ?? []) {
    for (const [name, def] of Object.entries(loc.interactions)) {
      emoji[name.toLowerCase()] = def.emoji;
    }
  }
  return emoji;
}

function buildItemEmoji(catalogue: ItemCatalogue | null): Record<string, string> {
  const emoji: Record<string, string> = {};
  for (const item of catalogue ?? []) {
    emoji[item.name.toLowerCase()] = item.emoji;
  }
  return emoji;
}

function titleCaseSnake(s: string) {
  const spaced = s.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// `sim_time` is a naive sim-local string "YYYY-MM-DDTHH:MM" — take the HH:MM
// part directly, never via new Date().
function formatSimTime(simTime: string) {
  return simTime.split('T')[1] ?? simTime;
}

function EntryRow({
  entry,
  interactionEmoji,
  itemEmoji,
}: {
  entry: JournalEntry;
  interactionEmoji: Record<string, string>;
  itemEmoji: Record<string, string>;
}) {
  const time = formatSimTime(entry.sim_time);

  switch (entry.type) {
    case 'plan':
      return (
        <div className="flex gap-md">
          <div className="text-xs text-muted font-display tabular-nums pt-xs w-12 flex-shrink-0">
            {time}
          </div>
          <div className="flex flex-col gap-xs flex-1">
            <div className="text-sm text-white">
              <span className="mr-1">📝</span>
              Plan for the day
            </div>
            <div className="text-sm text-muted italic">"{entry.plan}"</div>
          </div>
        </div>
      );
    case 'intent': {
      const key = entry.target.toLowerCase();
      const verb =
        entry.action === 'move'
          ? 'Heading to'
          : entry.action === 'item'
            ? 'Using'
            : 'Going to';
      const emoji =
        entry.action === 'move'
          ? '🚶'
          : entry.action === 'item'
            ? itemEmoji[key] ?? '📦'
            : interactionEmoji[key] ?? '🎯';
      return (
        <div className="flex gap-md">
          <div className="text-xs text-muted font-display tabular-nums pt-xs w-12 flex-shrink-0">
            {time}
          </div>
          <div className="text-sm text-white pt-xs">
            <span className="mr-1">{emoji}</span>
            {verb} <span className="text-accent">{titleCaseSnake(entry.target)}</span>
          </div>
        </div>
      );
    }
    case 'interaction':
    case 'item': {
      const ok = entry.outcome === 'success';
      return (
        <div className="flex gap-md">
          <div className="text-xs text-muted font-display tabular-nums pt-xs w-12 flex-shrink-0">
            {time}
          </div>
          <div className="flex flex-col gap-xs flex-1 min-w-0">
            <div className="text-sm text-white">
              <span className="mr-1">{ok ? '✓' : '✗'}</span>
              {titleCaseSnake(entry.target)}
              {!ok && (
                <span className="text-muted ml-sm">({entry.outcome})</span>
              )}
            </div>
            <div className="text-sm text-white whitespace-pre-line">
              {entry.observation}
            </div>
          </div>
        </div>
      );
    }
    case 'arrival':
      return (
        <div className="flex gap-md">
          <div className="text-xs text-muted font-display tabular-nums pt-xs w-12 flex-shrink-0">
            {time}
          </div>
          <div className="text-sm text-white pt-xs">
            <span className="mr-1">📍</span>
            Arrived at <span className="text-accent">{titleCaseSnake(entry.location)}</span>
          </div>
        </div>
      );
  }
}

// Reverse-chronological journal of an artist's plans, intents, interactions,
// item uses and arrivals within the current simulation.
export function ArtistJournal({ simulationId, artistId, live }: Props) {
  const { entries, loading } = useSimArtistJournal(simulationId, artistId, { live });
  const { map } = useWorldMap();
  const { items: catalogue } = useWorldItems();
  const interactionEmoji = buildInteractionEmoji(map);
  const itemEmoji = buildItemEmoji(catalogue);
  const sorted = [...entries].reverse();

  if (loading && entries.length === 0) {
    return (
      <div className="flex justify-center py-3xl">
        <div className="spinner large processing" />
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="text-center text-muted text-sm py-3xl">
        Nothing logged yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg rounded-lg p-md" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
      {sorted.map((entry, i) => (
        <EntryRow
          key={`${entry.sim_time}-${entry.type}-${i}`}
          entry={entry}
          interactionEmoji={interactionEmoji}
          itemEmoji={itemEmoji}
        />
      ))}
    </div>
  );
}
