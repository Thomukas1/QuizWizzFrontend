import { Camera, Tile } from '../scene';

// The bottom render pass: a textured cell under every tile in the board —
// content tiles *and* the filler tiles the camera padded in — so the world
// reads as ground instead of a void. `background(tile)` resolves each cell's
// CSS `background` value: a colour, a gradient, or `url(...)` from a texture
// pack. Return `undefined` to leave a cell empty.
//
// One texture per cell today. To go detailed later, this same loop stays put —
// only the per-cell <div> grows an inner N×N grid of sub-tiles. The data model
// and iteration don't change.
export function GroundLayer({
  camera,
  background,
}: {
  camera: Camera;
  background: (tile: Tile) => string | undefined;
}) {
  const { minX, minY, cols, rows } = camera.extent;
  const cells = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tile: Tile = [minX + col, minY + row];
      const bg = background(tile);
      if (!bg) continue;

      const { left, top } = camera.project(tile);
      cells.push(
        <div
          key={`${tile[0]},${tile[1]}`}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            left,
            top,
            width: camera.tileSize,
            height: camera.tileSize,
            background: bg,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />,
      );
    }
  }

  return <>{cells}</>;
}
