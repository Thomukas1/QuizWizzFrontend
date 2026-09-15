// --- Scene camera ------------------------------------------------------
// A tiny "Tier 1" rendering layer: think in tiles and a camera, not in raw
// pixel math. The backend gives everything an integer tile coordinate and
// uses those only for distance / travel maths — it doesn't care how things
// look. The camera's job is to turn those tiles into screen positions.
//
// All the coordinate math the board used to do inline now lives in one pure
// function, `frameTiles`. A `Camera` is the result: it knows the board size,
// the fit-to-viewport scale, and how to `project` a tile to a pixel. Feature
// code just places <Sprite>s at tiles and lets the camera do the rest.
//
// Two knobs are tuned by hand; everything else is derived:
//   tileSize - how many board pixels one logic tile spans. This is just an
//              internal resolution — bigger = crisper background art.
//   margin   - empty tiles of breathing room kept around the content.

export const TILE_SIZE = 100;
export const MARGIN_TILES = 1;

export type Tile = [number, number];

export interface PixelPos {
  left: number;
  top: number;
}

export interface Viewport {
  w: number;
  h: number;
}

// A framed view of a tile world. Built by `frameTiles`; consumed by <Stage>,
// <Sprite> and friends.
export interface Camera {
  /** Board dimensions in world pixels, already padded to fill the viewport. */
  readonly width: number;
  readonly height: number;
  /** Uniform CSS scale applied to the board so it fits the viewport. */
  readonly scale: number;
  /** World pixels per logic tile. */
  readonly tileSize: number;
  /** World tile -> board-pixel *centre* of that tile. */
  project(tile: Tile): PixelPos;
  /** The un-padded content region, in board px — e.g. for a spotlight/vignette. */
  readonly content: { left: number; top: number; width: number; height: number };
  /**
   * The full board extent in tiles, padding included. Iterate this to paint a
   * cell under every tile (e.g. the ground layer) — content tiles *and* the
   * filler tiles the camera added to cover the viewport.
   */
  readonly extent: { minX: number; minY: number; cols: number; rows: number };
}

// The content's extent, derived from the tiles it must contain.
interface Bounds {
  minX: number;
  minY: number;
  cols: number;
  rows: number;
  width: number;
  height: number;
}

// Build the content bounds from the tiles it has to show. It starts `margin`
// tiles before the top-left-most tile and ends `margin` past the
// bottom-right, so the content always sits inside with an even border.
function computeBounds(tiles: Tile[], tileSize: number, margin: number): Bounds {
  if (tiles.length === 0) {
    return { minX: 0, minY: 0, cols: 1, rows: 1, width: tileSize, height: tileSize };
  }
  const xs = tiles.map(t => t[0]);
  const ys = tiles.map(t => t[1]);
  const minX = Math.min(...xs) - margin;
  const minY = Math.min(...ys) - margin;
  const cols = Math.max(...xs) + margin - minX + 1;
  const rows = Math.max(...ys) + margin - minY + 1;
  return { minX, minY, cols, rows, width: cols * tileSize, height: rows * tileSize };
}

export interface FrameOptions {
  tileSize?: number;
  margin?: number;
}

// Frame a set of tiles into a Camera that fits the given viewport.
//
//  1. Bound the content (`computeBounds`).
//  2. Scale it to fit the viewport — the smaller axis ratio wins, so nothing
//     is clipped.
//  3. Pad the board with extra tiles on every side so the *scaled* board fully
//     covers the viewport — no letterbox bars above or beside the content.
//
// Pure: same tiles + viewport always yield the same camera.
export function frameTiles(
  tiles: Tile[],
  viewport: Viewport,
  { tileSize = TILE_SIZE, margin = MARGIN_TILES }: FrameOptions = {},
): Camera {
  const bounds = computeBounds(tiles, tileSize, margin);

  const scale = Math.min(viewport.w / bounds.width, viewport.h / bounds.height);

  const extraX = Math.ceil((viewport.w / scale - bounds.width) / (2 * tileSize));
  const extraY = Math.ceil((viewport.h / scale - bounds.height) / (2 * tileSize));

  const minX = bounds.minX - extraX;
  const minY = bounds.minY - extraY;
  const cols = bounds.cols + extraX * 2;
  const rows = bounds.rows + extraY * 2;
  const width = cols * tileSize;
  const height = rows * tileSize;

  return {
    width,
    height,
    scale,
    tileSize,
    project: ([tx, ty]: Tile): PixelPos => ({
      left: (tx - minX + 0.5) * tileSize,
      top: (ty - minY + 0.5) * tileSize,
    }),
    content: {
      left: extraX * tileSize,
      top: extraY * tileSize,
      width: bounds.width,
      height: bounds.height,
    },
    extent: { minX, minY, cols, rows },
  };
}
