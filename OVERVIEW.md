# SlopBop Frontend — Overview

A mobile-first React SPA (430px design target) that serves as the public-facing window into SlopBop.

This document covers the conceptual architecture and the decisions behind it. For the code-level orientation map (folder layout, styling system) see `CLAUDE.md`; the technical detail — routes, hooks, components, API surface — is the code itself and the service types in `src/services/`, which don't desync from it. The deferred simulation layer has its own doc: `SIMULATION.md`.

---

## What This App Is For

SlopBop is an **agentic music label**: a cast of synthetic artists release songs, and the audience judges them. The thesis the label is betting on — and the line the About page opens with — is that AI music only *bops* when there's an actual artist behind it, with a personality, a voice and a taste of its own. The audience's bops are what settle that bet, which is why judging is a first-class act and not a feature.

Judging is **one-sided on purpose**: you can bop a song, and that's the whole mechanic. There is no counter-vote, because *slop is the default state of every song* — the joke the label is named for. A bop is the only thing that lifts one out of it, so the count is both the like and the ranking, and the copy is an action ("bop it"), never a question ("slop or bop?"). The two-sided version came first and was dropped: ratios let a song with one bop out-rank a loved one, and a room full of people could tank each other's songs into a uniform 20%.

The commercial breakout is **group mixtape creation**, sold as **Mixtape Commissions**. A host rents one of the synthetic artists for a private activity with a group: everyone writes the lyrics for one short (~30s) song, the artist records them, and the finished songs release one-by-one on a shared **mixtape page** for the group to listen, react to, and bop. The most-bopped song earns a music video posted to our socials.

The public app is trimmed to point at this. The NavBar is **About · Roster · Commission**. Two earlier surfaces — the live simulation (`/map`) and the audition funnel (`/apply`) — are **hidden from the nav but still fully routed and working**, deferred rather than removed. See `SIMULATION.md`.

The specifics of the offer — group size, how a day runs, what the prize is, what a buyer needs on the day — are **owned by the Commission page and its FAQ**, not restated here. `src/features/commission/` is the source of truth for all of it; prose in a doc only drifts out of sync with it.

---

## Mental Model

The app holds two data layers and keeps them deliberately separate.

**Static layer** — who the artists are. Profiles, bios, discographies, cover art, released music. Permanent, not tied to any simulation. It lives in the `artists`, `collections`, and `songs` MongoDB collections and is fetched directly. **It is the bulk of the app and the entire public experience today.**

**Live layer** — what the artists are doing today. Simulation-scoped, ephemeral, and entirely contained within `/map`. Deferred; documented in `SIMULATION.md`.

| UI surface | Data layer | Entry point |
|---|---|---|
| About (`/`) | Static | Landing page |
| Roster (`/roster`) | Static | NavBar |
| Artist Profile (`/artists/:id`) | Static | Roster card, About's featured card |
| Commission (`/commission`) | Static + write | NavBar |
| World Map (`/map`) | Live (sim) | *hidden — see `SIMULATION.md`* |

A user lands on About, browses the roster, and listens to artists' music — all static, no simulation involved. The static surfaces never read the sim, and nothing outside `/map` mounts `SimProvider` or calls `useSim()`. **That containment is load-bearing: it's why the rest of the app is cheap to reason about, and it should survive the sim coming back.**

---

## The Commission Funnel

Three surfaces carry one argument, in order, and they're written to hand off to each other:

1. **About (`/`)** — states the label's thesis, shows a featured artist, and *teases* the commission. The teaser deliberately withholds the mechanic; if it explained the whole product there'd be no reason to tap through.
2. **Commission (`/commission`)** — the pitch: the offer, a real playable example mixtape, how a day runs (`DayBreakdown`), the prize (`PrizeVideo`), and the FAQ. The FAQ is the objection layer and sits *above* the ask on purpose, so nothing unresolved is still in the reader's head when the form arrives.
3. **`MixtapeOrderForm`** — the ask. Choosing an artist and making the ask are one act, so they're one component: the carousel's selection feeds straight into what gets sent.

**The ask is an email today.** `ContactForm` opens a `mailto:` to `slopboptv@gmail.com`. There is no payment or ordering flow. When one arrives — Stripe, a booking calendar — only the piece below the carousel changes; the framing, the selection and the section's own background stay, and `CommissionPage` never learns about it. Pricing is deliberately off the page: inbound only, quoted over email.

**Every mixtape is currently public**, which is what the FAQ says out loud. There is no private or unlisted mode, and no authentication to build one on. The known cheap path is unlisted-by-default (collection IDs are unguessable Mongo ObjectIds, so simply not listing a mixtape is most of the work) — but that buys *unlisted*, not *private*, and copy shouldn't promise otherwise.

---

## Music Player

Global playback state lives in `MusicPlayerContext` — a single persistent `HTMLAudioElement`, not recreated per track. Songs can be played from the artist profile, any collection page, the Commission page's example mixtape, or directly from a Roster card (which surfaces each artist's top-rated track as a one-tap shortcut). The MiniPlayer (sticky bottom bar) and full MusicPlayer overlay both read from this shared context.

Playback is a pure static-layer concern with **no sim gating**. Visibility is instead gated on the **real wall clock**: `release_date` is a real-world UTC timestamp, and a song whose `release_date` is still in the future hasn't dropped yet — the song list renders the soonest such song as a "processing" countdown card that reveals it automatically when its moment arrives. Songs already past their `release_date` (or with none) are always visible. `release_date` doubles as the catalogue sort key.

This is the same mechanic a commissioned mixtape's staggered release runs on. It is **not** the sim's `sim_time` drip-feed — two different clocks, and conflating them is a real bug waiting to happen.

---

## Images & Media Loading

Cover art, artist photos, and cover images are the heaviest thing the app loads. They live on **Arweave** (a decentralized, permanent store) and are served through the **`turbo-gateway.com`** gateway. Two facts drive the whole strategy: we **can't set response headers** on them (no `Cache-Control`, no server-side resize — it's not our server), and Arweave is **immutable and content-addressed** — a given URL's bytes can *never* change.

The download size itself is fixed at **upload time**, not here. The upload pipeline saves images as 1024×1024 WebP (not 2048 PNG), which is the only place bytes actually get smaller. **The frontend cannot shrink a download** — a browser must fetch the whole file before it can show it. So the frontend solves the two things it *can*: how the wait feels, and never waiting twice.

**Perceived speed — the `Img` primitive (`src/primitives/Img.tsx`).** Every remote image renders through `Img`, not a raw `<img>`. It decodes off-thread (`decoding="async"`) and fades the whole image in at once over a shimmer placeholder — killing the "image reveals slowly from the top" effect on slow connections. It also lazy-loads (offscreen grid/list images don't fetch until scrolled to) and reveals correctly for already-cached images. Styling lives in `src/styles/components/image.css`. It splits classes: `className` sizes the frame (aspect/rounding), `imgClassName` handles object-fit. This is *perceived* speed only — it does not reduce bytes. (It accepts an optional `placeholderSrc` for a true blurred low-res preview, unused today.)

**Never waiting twice — the service worker (`vite.config.ts`, via `vite-plugin-pwa`).** A generated service worker intercepts every `turbo-gateway.com` request and serves it **CacheFirst** from the browser's Cache API. Because Arweave content is immutable, "cache forever, serve from cache" is completely safe — there is no staleness risk, ever — which is exactly why this is worth doing here and would be dangerous against a mutable server. First load hits the network; every load after is instant and offline-capable. This is the decentralized-storage equivalent of the `Cache-Control` header we can't set. It's off during `vite dev` (so it never serves stale assets while developing) and auto-updates on deploy.

**Surviving the gateway — `src/services/arweave/`.** A gateway is not reliable, and it fails *slowly*: a sick `turbo-gateway.com` answers 504 only after ~15s, and a stalled sandbox redirect can run past 40s. So nothing waits for an error. The id in a stored url is a content address, not a location — any gateway that has indexed it serves the same bytes — so a load that has produced **no bytes at all** within ~2.5s is simply routed to the next gateway. Silence is observable immediately; failure is not.

`gateways.ts` holds that choice for the whole app: one active gateway per session, starting at `TRUSTED_GATEWAYS[0]`, moving only when something reports a dud, and taking audio, video, images and downloads with it when it moves. Consumers get two functions — `assetUrl` and `demoteGateway` — and track nothing themselves.

The mechanics still can't be shared across media types (an `<img>` has no `progress` event and no readable buffer; a media element has both), so there is one loader per medium and they all apply the same policy: `media.ts` for audio *and* video — they're both `HTMLMediaElement`, so they're one problem — `image.ts` for images, and `fetchArweave` for genuine downloads. React bindings are thin wrappers in `hooks/`: `useArweaveMedia` for a component-owned `<video>`, `useArweaveImage` behind the `Img` primitive. `MusicPlayerContext` drives `createMediaLoader` directly, since its element lives outside React, and is left owning only what's playing and where in the queue it is.

Failure is per-object, not per-host — measured on one gateway in one minute, one song returned 206 four times in six while another returned 504 four times in four. That's why there's no "ping once at startup and pick a winner": the decision is made per load, against the real url.

Two things follow that look optional and aren't. `Img` sends `crossorigin="anonymous"` for these hosts, because an opaque response reports status `0` whatever really came back — with `statuses: [0, 200]` the service worker cached gateway 504s **as the image**, for 60 days, turning a blip permanent. And the audio element re-assigns `src` to retry rather than calling `play()` again: after a failed load it sits in `NETWORK_NO_SOURCE` where `play()` can only reject, which is why a failed song used to stay broken until a page reload.

**If media storage ever changes**, the only coupling is `TRUSTED_GATEWAYS` in `src/services/arweave/gateways.ts` and the host regex in `vite.config.ts` — they mirror each other and must change together, or images served from a fallback host stop being cached. Every call site stays identical.

---

## The three collection types, and the one lifecycle two of them share

A **collection** is the generic container for an artist's songs, and `type`
discriminates three of them. They share one shape and one detail read
(`fetchCollection`); what separates them is *how the songs get there*, and that
difference drives every surface decision below.

| type | songs come from | window | lifecycle | surface |
|---|---|---|---|---|
| `album` | the artist — authored | none | permanent | `/albums/:id`, listed in Discography |
| `mixtape` | a commissioning group | start → deadline | permanent | `/mixtapes/:id`, reached by its own link |
| `jam` | anyone, one per device | start → deadline, capacity too | **the most-bopped song is promoted to a single; the rest are deleted** | `/jams/:id`, reached from the card on About |

Three consequences worth holding onto:

- **Only `album` appears in the Discography.** A jam is a live session, not a
  release; a commissioned mixtape is a group's artifact from their own day, and
  listing it would file someone's birthday party under the label's catalogue.
- **Only the crowdsourced two carry `request_status`.** An album returns none, so
  the submission UI has nothing to gate on and simply never renders.
- **The crowdsourced two run one lifecycle — the open call**, and differ only in
  what happens at the end of it. See below.

## The open call

A mixtape and a jam are the same machine pointed at different ends: a window
opens, anyone may submit against it, the window shuts, and *then* the songs are
produced and released one at a time. `OpenCallStatus` is that lifecycle, returned
as `open_call_status` by every read that carries one, and both types have one.

**Nothing is produced while the window is open.** A collection's detail read
answers `songs: []` for the whole of `scheduled` and `open` — which is why
neither page renders a tracklist in those phases. An empty list under a live call
reads as a page that failed to load, where the call itself — the pitch, the
countdown, the writer, the count — reads as an invitation. The tracks arrive at
the deadline as unreleased songs with staggered `release_date`s, and `SongList`'s
countdown card reveals them one by one. (That path predates all this; it just
never fired on a jam before.)

`src/components/opencall/` is the one implementation: `OpenCall` owns the state
machine and the layout, and knows nothing about jams or mixtapes. Each page
passes its own wording in as an `OpenCallCopy` — the voice is the page's, and the
two sound nothing alike. `Notice` is the small centred card the non-form states
are said in.

`OpenCallStatus.phase` is the discriminator for everything:
`scheduled → open → awaiting_resolution → resolved`, plus `closed` for a call
nobody entered. It is **not** the same question as `request_status.open`, and the
two are deliberately not merged: `request_status` is "can I submit right now"
(capacity included) and is the only thing that gates the form, while `phase` is
where the event itself has got to. A jam that filled on day two is closed to
submissions while still in its `open` phase.

**A jam is the label's event, not an artist's.** Nobody in the app starts one or
picks its winner — both writes moved behind the backend's curation key, and the
winner is settled by bops alone (ties broken by earliest submission). That's what
promotes voting from decoration to the mechanic: once the tracks land, the
tracklist *is* the standings, which is why `JamPage` opens it most-bopped-first
and polls.

So a jam is global, and `GET /collections/jams/current` (`useCurrentJam`) is the
read that headlines About — no artist id, and it answers with the most recently
started jam in *any* phase, so the last one keeps showing between events. A 200
with `collection: null` means the label has never run one; that's a fact, not an
error.

**There is exactly one jam card**, `PublicJamCard` on About, and it owns its own
phase copy. The artist profile used to carry a second, row-shaped one plus a LIVE
badge; both were cosmetic, and keeping two cards honest about one jam meant a
shared copy module *and* a client-side phase derivation duplicating the backend's
clock — a lot of machinery for decoration. They're cut, and both those pieces went
with them. Git has all three if the profile should announce a jam again.

**The jam-only one that bites: a resolved jam's detail read returns
`songs: []`** — the winner's `collection_id` was cleared and the also-rans
deleted — so the winner is fetched separately by
`open_call_status.selected_song_id` (the one field a mixtape's open call doesn't
carry). It inherits the jam's cover, which is what ties it back to the event.
That makes *two* phases a jam answers empty in, and neither is a failed read.

---

## Routing

```
/                  AboutPage       — label thesis + commission teaser              [nav]
/about             AboutPage       — alias of /
/roster            RosterPage      — artist directory + top-rated song per artist  [nav]
/commission        CommissionPage  — commission an artist: offer + inquiry form    [nav]
/artists/:id       ArtistProfile   — static profile + discography
/albums/:id        AlbumPage       — authored album: plain tracklist
/mixtapes/:id      MixtapePage     — commissioned mixtape: tracklist + windowed submissions
/jams/:id          JamPage         — live jam: tracklist + capacity-bound submissions
/map               MapPage         — self-contained live simulation, world map     (hidden)
/apply             ApplicationForm — audition form to join a future season         (hidden)
```

`[nav]` marks the three NavBar tabs; `(hidden)` routes still work if visited directly but aren't linked — they're deferred, not removed (`SIMULATION.md`). Every visible route is purely static (or, for `/commission`, write-only) and never mounts `SimProvider` or reads `useSim()`. A `ScrollToTop` mounted in `main.tsx` resets the scroll container (the `<html>` element) on every route change.

---

## Key Architectural Decisions

**Static artist data fetched per page.** Profile and collection pages fetch their own data independently. There is no global artist cache — each route is self-contained.

**Session-static data cached at module scope, once.** `useResource`'s `cache: true` owns module-scope caching and in-flight dedup for data that can't change during a session (form config, and the sim's world map / item catalogue). Don't hand-roll caching in a hook alongside it.

**Media is cached client-side, not server-side.** Images come from Arweave via `turbo-gateway.com`, whose headers we don't control — but its content is immutable, so a CacheFirst service worker caches it forever, safely. The `Img` primitive handles perceived speed on top. See *Images & Media Loading*.

**Styling is a token-driven hybrid.** Tailwind utilities for the everyday (layout, spacing, one-offs); central CSS under `src/styles/` for animations and reusable components with real visual identity, all reading the same design tokens in `theme.css` so a retheme is a palette swap. The operational "which do I use when" rule lives in `CLAUDE.md`, and the intent behind the palette in `src/styles/THEME.md`. The decision here is that both systems exist on purpose and share one token source — they are not two competing systems.

**Deferred, not deleted.** The sim and the application funnel stay routed and working while hidden from the nav. The cost is carrying code no user reaches; the reason is that they're the roadmap, not abandoned work, and un-hiding is a NavBar edit rather than a rebuild.
