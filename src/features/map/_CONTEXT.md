# Map feature

The world map — the public window into the live simulation. It paints the
sim's locations and agents onto a game-like board you can tap to inspect.

The backend gives every location and agent an **integer tile coordinate**, and
uses those purely for distance / travel maths — it has no opinion on how any of
it looks. This feature's whole job is to turn those coordinates into a board.

## The core split: engine vs visuals

Everything here divides into two layers, and keeping them apart is the point:

- **`scene/` — the engine.** Math and positioning, no looks of its own. A
  `Camera` frames a set of tiles, owns the fit-to-viewport scale, and projects
  any tile to a pixel. `<Stage>` is the scaled board; `<Sprite>` places a child
  at a tile and centres it. Think "where things go." This layer is generic —
  it knows nothing about locations, artists, or terrain.

- **`board/` — the visual layer.** Everything that actually paints, built on
  top of the engine. The ground, the grid, the vignette, the tile art data, the
  clickable markers, and the composition that wires them to live sim data.
  Think "what things look like."

Dependency flows one way: `board/` uses `scene/`; `scene/` never reaches back.
If you find yourself importing sim/location/artist types into `scene/`, it
belongs in `board/` instead.

## Folder roles

- **`MapPage.tsx`** — the page. Owns selection state and the open/close of the
  detail surfaces; renders the board plus the chrome.
- **`scene/`** — the engine (camera, viewport, stage, sprite). Start in
  `camera.ts`; its header comment explains the framing maths.
- **`board/`** — the visual layer. `WorldBoard` is the composition: it frames
  the camera, groups the live snapshot into per-location occupants vs. loose
  agents, and stacks the render passes.
  - **render passes** — `GroundLayer` (textured ground under every tile),
    `GridLines` (dev/visual tile grid), `Spotlight` (vignette). Each takes a
    camera and paints one pass; they compose as siblings under `<Stage>`.
  - **`terrain.ts`** — the tile art *data* (see Tile art below).
  - **`interactables/`** — the tappable entities: `LocationIcon`,
    `AgentMarker`. Pure presentation — a `<Sprite>` positions them, so they
    carry no coordinate maths. Tapping bubbles up to open a detail surface.
- **`details/`** — the tap-to-open surfaces: the artist bottom sheet (status /
  bars / journal) and the location panel. Driven by the live sim snapshot.
- **`chrome/`** — persistent map overlays: the sim HUD (date/time/weather) and
  the first-visit welcome modal.

## Render order

Within `<Stage>`, painting goes bottom to top:

```
GroundLayer  →  GridLines  →  Spotlight  →  location + agent sprites
  (textures)     (overlay)     (vignette)     (the interactables, on top)
```

## Tile art

The art is deliberately decoupled from the sim. The backend's grid is small and
*logic only* — art resolution is ours to choose and need not match it.

Today the look is **one texture per cell**: each cell is a whole place (a park,
a street, water). The data lives entirely frontend-side in `terrain.ts` (a
hand-authored cell→type map plus a texture pack), because the sim models no
terrain. Cells we don't author — including the filler tiles the camera pads in
to cover the viewport — fall back to a default so edges never show a void.

This is intentionally the simplest case of a richer look later (see Next steps).

## Data flow

`WorldBoard` reads three hooks: the world map and artist roster (both static for
a season, fetched once) and the live sim snapshot from `SimContext`. The
snapshot polls only while the sim is live and advances roughly every ten
minutes — so there is **no realtime-movement requirement**, which is why a plain
DOM scene (not a WebGL engine) is the right tool. The why behind that choice,
and the whole simulation's mental model, live in the repo-root `OVERVIEW.md`.

## Next steps — making it flourish

Roughly in order of payoff:

1. **Author the tilemap.** Fill `terrain.ts`'s cell→terrain map against the real
   location layout so the ground reads as a place, not a flat field.
2. **Real textures.** Swap the placeholder CSS gradients for an actual texture
   pack, and raise the camera's tile size for crisper art (it's just internal
   resolution).
3. **Kill the "sci-fi terminal" feel.** Turn the dev grid down once art lines
   up; warm the palette; round off hard edges.
4. **Make it breathe.** Ambient motion that needs no sim tick — gentle tree
   sway, water shimmer, drifting clouds — plus a day/night tint driven by the
   sim clock the HUD already reads.
5. **Decorative scatter.** Non-interactive props (lamps, benches, trees) placed
   as plain sprites between locations, to fill the world.
6. **Evolve to sub-tiled art.** When one-texture-per-cell feels too coarse,
   subdivide each cell into a grid of smaller blended tiles. This is additive:
   the tilemap stays the source of truth and only `GroundLayer`'s per-cell
   rendering gains detail — the engine, data model, and sprite layer don't move.
7. **Only then consider a canvas renderer.** Reach for one (react-konva first,
   Pixi/WebGL only at real scale) if a concrete ambition arrives that the DOM
   makes painful: camera pan/zoom, animated sprite sheets, particle/glow
   effects, or hundreds of moving entities. Until one of those is real, stay in
   the DOM scene.
```
