import { Tile } from '../scene';

// --- Tile art data -----------------------------------------------------
// Frontend-only: the simulation models no terrain, so how each tile *looks*
// lives entirely here. The backend's 5x5 is just coordinates for travel maths;
// this paints those cells.
//
// Coarse "one texture per cell" today — each cell is a whole place (a park, a
// street, water). This is forward-compatible with a future sub-tiled look:
// the TILEMAP below stays the source of truth; only GroundLayer's per-cell
// rendering would gain detail.

export type Terrain = 'grass' | 'park' | 'street' | 'plaza' | 'water';

// The texture pack. Placeholder CSS gradients for now — swap each entry for a
// real texture as `url(/textures/<name>.png) center/cover` when the art lands.
// Warm, organic tones on purpose: the goal is a breathing town, not a terminal.
export const TERRAIN_TEXTURE: Record<Terrain, string> = {
  grass: 'radial-gradient(circle at 30% 25%, #6f8f4a, #5c7a3d)',
  park: 'radial-gradient(circle at 40% 30%, #4f7a3a, #3c6230)',
  street: 'linear-gradient(135deg, #8a7f73, #766c61)',
  plaza: 'radial-gradient(circle at 50% 40%, #cbb48a, #b39c72)',
  water: 'linear-gradient(160deg, #5a93a6, #437688)',
};

// Cells with no explicit terrain (including the camera's padding tiles) fall
// back to this, so the board never shows a void edge.
const DEFAULT_TERRAIN: Terrain = 'grass';

// Hand-authored cell -> terrain, keyed "x,y". Fill this in against your real
// location layout; anything omitted becomes DEFAULT_TERRAIN. Example:
//   '2,2': 'plaza',   // central square
//   '0,0': 'water',
export const TILEMAP: Record<string, Terrain> = {};

// Resolve a tile to the CSS `background` for its ground cell.
export function terrainBackground([x, y]: Tile): string {
  const terrain = TILEMAP[`${x},${y}`] ?? DEFAULT_TERRAIN;
  return TERRAIN_TEXTURE[terrain];
}
