# Terrain — open question (TEMPORARY)

> Scratch doc, not architecture. Captures an unresolved design discussion to
> pick up **2026-06-05**. Once decided, fold the outcome into `_CONTEXT.md` /
> `terrain.ts` and **delete this file.**

## The problem

`board/terrain.ts` currently hand-maps **coordinate → texture**. That's brittle:

- Map layout is **data-driven** — location coordinates live in the DB and can
  move. Bounds are computed from the extent of locations, so moving one
  location redraws (and rescales) the whole board.
- A hand-authored tilemap keyed by absolute coordinates therefore breaks the
  moment coordinates change, and is miserable to author by hand — worse if we
  ever want multiple textures within a tile.

## Framing (what we worked out)

### 1. You can't have all three — pick two
1. **Adaptive layout** (move a coordinate, board redraws)
2. **Hand-authored art** (place each tile's look)
3. **Low effort**

We're currently in the worst corner: adaptive layout + hand-authored art. If
layout is arbitrary at runtime, you can't pre-paint it. So either layout stops
being arbitrary, or art stops being hand-placed.

### 2. Separate the tile's *type* from its *texture*
- **Type layer** — coordinate → semantic type (`grass`/`water`/`road`). Coarse.
- **Texture layer** — type (+ neighbors) → actual art. Always *derived*.
- Bridge = **autotiling / bitmasking / Wang tiles**: author a small tileset
  once; for each cell, a bitmask of its neighbors auto-picks the right
  edge/corner sprite. Nobody hand-places transitions. This is the piece that
  makes "multiple textures per tile" feasible.
- Punchline: **nobody hand-paints tiles.** The only artifact is a coarse
  *type per cell*; everything visual is derived.

### 3. The type map can generate itself
Spectrum of who produces the coarse type map:
- **Noise / biomes** — deterministic PRNG + Perlin/simplex; adapts to any bounds.
- **Location-derived rules** (likely sweet spot) — compute structure *from* the
  coordinates we already have: auto-route roads between neighboring locations,
  stamp a plaza/clearing footprint around each location, noise-fill the rest.
  Adapts to coordinate moves for free.
- **WFC** — fancier coherent towns, if ever wanted.

## Where should it live? (decision rule)

Ask: **does terrain carry meaning the simulation needs?**

- **Cosmetic only (today)** → generate **frontend-side, deterministically**
  (seed → pure function), store **nothing**. Every client computes the identical
  world from a seed. Keeps the sim clean ("backend doesn't care how the map
  looks"). No DB, no migration.
- **Gameplay-relevant later** (water blocks travel, etc.) → the *type* map is
  authoritative game state → lives in sim/DB. But even then the sim owns the
  **type**, the frontend still owns the **texture**. Pixels/texture filenames
  never go in the DB.
- "Generate textures in the simulator and store in DB" → **almost certainly no.**
  At most store coarse semantics, and only if they drive the sim.

## Related hazard (separate issue, don't let it hide)

Arbitrary coordinates break **scaling**, not just terrain: one outlier (e.g. a
location at `1,10`) stretches the bounds and the fit-to-viewport scale shrinks
everything to unreadable on mobile. Even perfect terrain can't fix a bad layout.
→ Decide separately: should coordinates be constrained to a sane bounding box,
or should we drop fit-the-whole-map in favor of pan/scroll?

## Current lean

If terrain stays cosmetic: **coarse type map, generated frontend-side from a
stable seed using location-derived rules + noise, expanded to textures via
autotiling.** `terrain.ts` becomes a small deterministic generator + an autotile
lookup instead of a hand-list. Zero hand-authoring, adapts to coordinate
changes, sim stays clean, nothing stored.

## Decide tomorrow (these two drive everything)

1. **How dynamic are location coordinates, really?** Move/added each season, or
   basically fixed once a world is set up? (If basically fixed: "generate
   offline once, hand-tweak, commit as a static asset" becomes viable —
   generative authoring with human polish, no runtime cost.)
2. **Will terrain ever mean anything to the simulation,** or is it forever just
   vibes? (The only thing that justifies the DB.)
