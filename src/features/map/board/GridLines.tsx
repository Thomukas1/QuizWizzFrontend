import { Camera } from '../scene';

// Development aid: draws the tile grid over the board so you can check that
// icons line up with the background art. 0.0 = hidden, 1.0 = fully opaque.
// Set to 0 once the art lines up.
const GRIDLINE_OPACITY = 0.3;

export function GridLines({ camera }: { camera: Camera }) {
  if (GRIDLINE_OPACITY <= 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: GRIDLINE_OPACITY }}
    >
      {/* Tile grid over the whole board. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), ' +
            'linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: `${camera.tileSize}px ${camera.tileSize}px`,
        }}
      />
    </div>
  );
}
