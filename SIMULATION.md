# SlopBop Frontend — The Simulation Layer

**Status: deferred.** Everything here is **present in the code, fully routed, and working** — it is simply not linked from the NavBar while the product points at mixtape commissions (see `OVERVIEW.md`). Nothing described here has been removed or stubbed. This document is parked context: read it when the sim comes back, not before.

Two surfaces are parked here — a show, and the funnel that casts it:

- **Simulation / Map (`/map`)** — the live "artist lives a day" loop.
- **Application (`/apply`)** — the audition funnel that supplies the cast.

They're filed together because they were deferred together, **not because they're coupled.** `/apply` is the artist-supply funnel, and growing the roster is live work today — so it may well come back on its own, well before the sim does. Nothing in the sim's code depends on it, and nothing in it depends on the sim; the frontend just collects a validated application and hands it off. Treat the pairing here as filing, not architecture.

Restore either by re-adding its entry to `TABS` in `src/components/NavBar.tsx`. That is the whole of what "hidden" means.

---

## The Live Layer

The app holds two data layers and keeps them deliberately separate. `OVERVIEW.md` describes the static one; this is the other.

**Live layer** — what the artists are doing *today*. Location on the map, simulation stats (Energy / Focus / Inspiration), journal entries, song-idea notes. This data is simulation-scoped and ephemeral. It lives in the `simulations` collection and is fetched through the sim endpoints.

It is **entirely contained within the Map page** — nothing outside `/map` touches the sim. That containment is the single most important property of this layer, and the thing most likely to be eroded by a well-meaning change.

---

## Sim Is Scoped to the Map Page

`SimProvider` mounts on `/map` and nowhere else, so the `/sim/current` heartbeat only runs while the map is on screen and stops the moment you leave. The static surfaces (roster, profile, collection pages) never read the sim — their artists come straight from the `artists` collection and their songs are always visible, independent of any sim clock.

The layers meet in exactly one direction: the ArtistSheet on the live map links out to a static profile. **The static side has no knowledge of the sim.** Keep it that way — the reason the rest of the app is cheap to reason about is that the live layer can't leak into it.

---

## The Drip-Feed Mechanic

The simulation runs ahead of time and the frontend reveals it progressively. The live-layer streams gated by time — entries in the journal, notes in the bars tab — are filtered by `sim_time`, the cutoff resolved by the backend. Nothing from the future leaks through.

Songs are **not** part of this. The static music catalogue is always fully visible and decoupled from the sim clock; song visibility is gated on the real wall clock instead (see *Music Player* in `OVERVIEW.md`). These are two different clocks and conflating them is a real bug waiting to happen.

`SimContext` holds the current sim snapshot and polls every 2 minutes while the sim is live. Its provider is mounted by the Map page alone, so only the map's components read it via `useSim()`. This is the heartbeat of the live layer, and it beats only while you're watching the map.

---

## ArtistSheet: Where Live and Static Meet

The `ArtistSheet` (bottom sheet, opened by tapping an artist on the map) is the only surface that shows live simulation data about an artist. Three tabs:

- **Status** — location, current action, stat bars, carried items
- **Bars** — song-idea notes the artist wrote in their notebook during the sim
- **Journal** — reverse-chronological log of everything the artist did (plans, intents, interactions, arrivals)

The "View Profile" link navigates to the static artist profile. That profile has no simulation data on it — no stats, no journal. The separation is strict: live data stays on the map, static data stays on the profile.

---

## The Application Form

`/apply` is the audience's way *into* the show — a form to audition as a contestant for a future season.

The form's content — the personality questions, the audition prompts, the option lists — is **served by the backend**, not hardcoded here. The frontend fetches a config once and renders the form's tiers from it, so the question bank changes without a frontend deploy. On submit, the backend is the trust boundary: it validates, derives the applicant's archetype, and returns it for a thank-you screen. The frontend mirrors the validation rules for instant feedback, but they're owned server-side.

This is the front of the casting funnel. Everything downstream of a validated submission — screening, selection, turning a chosen application into a simulation artist — happens off the frontend entirely.

---

## Key Decisions

**Simulation is scoped to the Map page.** `SimProvider` mounts on `/map`, fetches `/sim/current`, and polls while live; all map + sheet components consume it via `useSim()`. Leaving `/map` unmounts the provider and stops the heartbeat, so the sim never loads on the static routes.

**World map and item catalogue cached at module scope.** `useWorldMap` and `useWorldItems` are fetched once per session with in-flight dedup — they're static for a season. Both go through `useResource`'s `cache: true`; don't hand-roll module-level caching alongside it.

**No time-scrubbing UI yet.** The backend supports `GET /sim?at=` for arbitrary cutoffs, but the frontend always uses `/sim/current`. Time scrubbing is a future feature, and the backend is already ready for it.

**Pan/zoom deferred.** The map uses a CSS fit-scale (`grid.ts` → `computeBounds`) to make the whole world visible at once. Future pan/zoom would start from this as the default zoom level.

---

## Deeper Detail

The map feature carries its own docs, which go below the altitude of this file:

- `src/features/map/_CONTEXT.md`
- `src/features/map/_TERRAIN_OPEN_QUESTION.md`

These are the one deliberate exception to the "no per-feature doc files" rule in `CLAUDE.md`. The rule exists because feature docs rot next to code that keeps moving — these are safe precisely because the code they describe is frozen while the sim is deferred. **If the sim comes back and the map changes, they rot like anything else.** Re-read them against the code before trusting them, and fold anything still true into this file.
