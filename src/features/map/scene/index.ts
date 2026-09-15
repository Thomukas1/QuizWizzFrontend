// The scene engine: math & positioning, no visuals of its own. Frame a tile
// world with `useCamera`, wrap it in a <Stage>, and drop <Sprite>s at tile
// coordinates — the camera owns every tile -> pixel projection. What those
// sprites and the ground actually *look* like is the visual layer's job
// (see ../board). See camera.ts for the why.
export { TILE_SIZE, MARGIN_TILES, frameTiles } from './camera';
export type { Camera, Tile, PixelPos, Viewport, FrameOptions } from './camera';
export { useCamera } from './useCamera';
export { Stage } from './Stage';
export { Sprite } from './Sprite';
