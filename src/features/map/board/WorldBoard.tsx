import { useMemo } from 'react';
import { useWorldMap } from '../../../hooks/sim';
import { useArtists } from '../../../hooks/artists';
import { useSim } from '../../../context/SimContext';
import { Artist, Location } from '../../../services/slopbop';
import { Stage, Sprite, useCamera, Tile } from '../scene';
import { GroundLayer } from './GroundLayer';
import { GridLines } from './GridLines';
import { Spotlight } from './Spotlight';
import { LocationIcon } from './interactables/LocationIcon';
import { AgentMarker } from './interactables/AgentMarker';
import { terrainBackground } from './terrain';

const tileKey = (t: Tile) => `${t[0]},${t[1]}`;

export function WorldBoard({
  onSelectLocation,
  onSelectArtist,
}: {
  onSelectLocation: (loc: Location, occupants: Artist[]) => void;
  onSelectArtist: (artist: Artist) => void;
}) {
  const { map: locations, loading: mapLoading } = useWorldMap();
  const { artists, loading: artistsLoading } = useArtists();
  const { sim } = useSim();

  const loading = mapLoading || artistsLoading;

  // Frame the world around the location tiles — the camera owns the fit and
  // every tile -> pixel projection from here on.
  const tiles = useMemo(() => (locations ?? []).map(l => l.position), [locations]);
  const camera = useCamera(tiles);

  // Group the live snapshot: agents standing on a location tile become that
  // location's occupant count; agents elsewhere are drawn loose on the board.
  const artistById = new Map(artists.map(a => [a.artist_id, a]));
  const locationByTile = new Map((locations ?? []).map(l => [tileKey(l.position), l]));
  const occupantsByLocation = new Map<string, Artist[]>();
  const looseAgents: { artist: Artist; tile: Tile }[] = [];

  if (sim) {
    for (const [id, snap] of Object.entries(sim.artists)) {
      const artist = artistById.get(id);
      if (!artist || !snap?.position) continue;
      const loc = locationByTile.get(tileKey(snap.position));
      if (loc) {
        const list = occupantsByLocation.get(loc._id) ?? [];
        list.push(artist);
        occupantsByLocation.set(loc._id, list);
      } else {
        looseAgents.push({ artist, tile: snap.position });
      }
    }
  }

  if (loading) {
    return <p className="text-muted text-sm">Loading world...</p>;
  }

  return (
    <Stage camera={camera}>
      <GroundLayer camera={camera} background={terrainBackground} />
      <GridLines camera={camera} />
      <Spotlight camera={camera} />

      {locations?.map(loc => (
        <Sprite key={loc._id} camera={camera} tile={loc.position}>
          <LocationIcon
            location={loc}
            occupantCount={occupantsByLocation.get(loc._id)?.length ?? 0}
            onClick={() => onSelectLocation(loc, occupantsByLocation.get(loc._id) ?? [])}
          />
        </Sprite>
      ))}

      {looseAgents.map(({ artist, tile }) => (
        <Sprite key={artist.artist_id} camera={camera} tile={tile} z={10} glide>
          <AgentMarker artist={artist} onClick={() => onSelectArtist(artist)} />
        </Sprite>
      ))}
    </Stage>
  );
}
