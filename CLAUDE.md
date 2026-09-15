# SlopBop Frontend

Mobile-first React web app (430px design target) — the public window into SlopBop. `OVERVIEW.md` has the mental model and the *why*; this file is the orientation map for working in the code.

## Current focus

**Group mixtape creation**, sold as **Mixtape Commissions**: a host rents a synthetic artist for a day with a group, everyone writes lyrics for a short song, the artist records them, and the songs release one-by-one on a shared mixtape page to react to and bop. The most-bopped song gets a music video on our socials.

Nav is **About · Roster · Mixtape · Account**. About (`/`) states the label's thesis and teases the offer; the Mixtape page (`/commission`) carries the pitch and ends in a `mailto:` inquiry — no payment or ordering flow yet. Pricing is deliberately off the page: inbound only, quoted over email. The offer's specifics — group size, the shape of a day, the prize — live in `features/commission/`, not here.

Sold as *Mixtape* in the nav, named *commission* in code and URL, because `features/mixtape/` is already the mixtape a group **receives** (`/mixtapes/:id`).

**Apply (`/apply`)** is live but has no tab of its own — it's reached from the CTA at the end of the Roster, where someone has just scrolled every artist. Nav is full at four entries (430px), and a fifth would dilute the Mixtape push.

**Map (`/map`)** is hidden from the nav but fully routed — deferred, not removed. Its context is parked in `SIMULATION.md`; un-hiding it is an edit to `TABS` in `components/NavBar.tsx`.

## Stack

React 19 · TypeScript · Vite · Tailwind 3 · React Router v7 · `@solana/wallet-adapter-react` (Phantom / Solflare / MWA).

Env: `VITE_API_URL` (backend base, defaults `http://localhost:5000`), `VITE_SOL_NETWORK`, `VITE_HELIUS_API_KEY` (unset — nothing makes an RPC call yet; `RPC_CONFIG` in `services/solana/network.ts` fails loudly the day something does), and `VITE_DEV_WALLET_KEY` (`services/solana/devSigner.ts`, set in **`.env.local`**) — a dev-only private key that signs in on load with no wallet, no extension and no popup, which is what makes the app usable in an embedded browser. The `VITE_` prefix is mandatory, not decorative: Vite only exposes prefixed vars to client code. `.env.local` is loaded during `vite build` too, so the *only* thing keeping the key out of a bundle is that every read of it sits behind `import.meta.env.DEV`. If you edit that file, re-verify by building and grepping `dist/` for the key material.

`devSigner()` returns `{ address, signMessage, signTransaction }` — plain functions, **not** a wallet adapter. It was an adapter once; a private key needs none, since `signInWithWallet` already takes an injected signer, and the adapter cost a class, a `localStorage` poke and wallet-selection interference to exercise plumbing that can't run without an extension anyway. Sign transactions in dev through `devSigner().signTransaction`.

## Code layout

- **`src/services/<service>/`** — one folder per backend, one file per resource, plus a same-named barrel. **The types here are the API contract** — keep them honest; the rest of the app points at them rather than restating shapes.
- **`src/services/solana/`** — the on-chain layer: cluster and RPC config, the wallet adapter list, the dev wallet, and the signature wire format. Deliberately thin, because `@solana/wallet-adapter-react` already *is* the service layer for connecting and signing: **no `Connection` singleton** (`ConnectionProvider` holds it) and **no wrapper around `useWallet`**. Transactions belong here when they arrive. Everything Solana-shaped goes in this folder — `services/slopbop/` speaks the API contract and shouldn't know about ed25519 or base58.
- **`src/hooks/<domain>/`** — hook-per-resource, grouped the same way `services/` is and with a same-named barrel, so a hook is imported from its domain (`hooks/songs`) rather than its filename. Import through the barrel, never the file. `useResource.ts` stays at the root because every domain builds on it. Reads build on `useResource<T>(fetcher, key, { onError?, pollMs?, cache? })`, which owns the stale-response guard, polling and `error`. `cache: true` caches at module scope and dedupes the in-flight request for session-static data — don't hand-roll that in a hook. Wallet-gated mutations are command-shaped: a submit hook per action. `hooks/arweave/` and `hooks/solana/` are the odd ones out: not backend resources, but the React face of their services.
- **`src/features/<feature>/`** — one folder per route: the page plus its components, co-located.
- **`src/context/`** — true app-wide singletons only: `SimContext`, `MusicPlayerContext` (one persistent audio element), `ToastContext`, `AuthContext`.
- **`src/components/`** — shared UI richer than a primitive: app-shell chrome, and blocks assembled from primitives. When two features need the same block it lives here, so no feature reaches into another's folder.
- **`src/primitives/`** — presentation-only, no domain shape. If it encodes a product concept or is assembled from other pieces, it's a `components/` block.

## The signed-in user

**One store, `services/slopbop/session.ts`.** It holds the token, the user, and the artists they control, and it's the only place any of that lives. `apiFetch` reads the token from it; React reads the rest with `useSyncExternalStore` via `AuthProvider`. **Never mirror session state into component state** — a copy is a thing that can disagree, which is what this replaced. `auth.ts` owns the challenge → sign → verify → `/auth/me` flow and is the only writer.

**A user is not an artist.** `isAuthed` means a wallet was proved — that's the only thing that should gate "may you act at all". `artists` is a separate fact and is usually empty: most signed-in people are audience. Gating UI on `artists.length` turns an ordinary account into a broken one. Zero is valid, several is valid.

**Session endings are handled once**, inside `apiFetch`, and **the `reason` decides — not the status.** Every auth refusal carries a stable code (`token_expired`, `session_revoked`, `account_not_found`, `account_disabled`, `invalid_token`…); `SESSION_ENDED` in `client.ts` maps the ones that mean "this session is over" to what to say about each. That's why `account_disabled` ends a session despite being a 403, why `auth_not_configured` doesn't despite being fatal, and why `/auth/verify`'s 401s need no special case — `invalid_signature` simply isn't in the map. Feature hooks handle only what's theirs (403, 404, 409) and must not re-implement logout.

**Sign out through `endSession()`, never `session.signOut()` directly.** Sessions are rows on the backend, so dropping the token locally leaves a working token behind; `endSession` clears locally first (so the UI moves immediately) and revokes the row in the background. All three endings — the button, a wallet switching address, a wallet disconnecting — go through it.

**`/auth/me` returns `ArtistIdentity` (`artist_id` + `name`), not `Artist`.** The full document is live simulator state, so a session holding a copy holds one that drifts. Anything richer comes from `GET /slopbop/artists/:id`, which is current and is the only thing that carries `is_owner`.

**Don't hand-roll `fetch`.** `ApiError` carries `status` and the parsed `body`, so endpoints answering with field errors or a `reason` code are readable through `apiFetch`. Dropping out of it silently drops the Authorization header.

**Ownership is the server's answer.** Gate owner UI on `is_owner` from the artist's own fetch, never by comparing a public key to `owner_id`. It's a rendering hint: forging it only draws buttons.

**Account (`/account`) is the one place signing in happens**, and it's a landing rather than a destination: controlling exactly one artist it redirects (`replace`) to `/artists/:id`, and every other answer — pick between several, an audience account, a wallet still to prove — is a state of the page. There is no `/me` page; an owner sees the same URL as everyone else, with more on it.

The signature prompt fires from `AccountPage` alone, once a wallet connects. **Don't trigger `login()` from anywhere else** — arriving on that page is what makes an unprompted signature request honest, and a connect button elsewhere would ambush someone with a wallet popup. The single exception is `bootSession()` in `AuthProvider`, which signs in from the dev key when there is one — safe because there's no prompt to fire, and a no-op outside dev. That key **outranks a stored session for a different wallet**, so swapping `VITE_DEV_WALLET_KEY` takes effect on reload rather than being shadowed by whoever signed in last. `NavBar` is purely navigational: four constant paths, no conditional destinations, no sheet.

## Styling — two systems by design

1. **Tailwind inline in TSX** — the default. Layout, spacing, one-off structure, simple states.
2. **`src/styles/`** — animations, complex or stateful selectors, and reusable components with real visual identity. `theme.css` holds the tokens (swap ~10 palette values to retheme the app); `components/*.css` is one file per component, `@import`ed by `index.css`. Use the tokens, never raw values.

Reach for Tailwind first. **Never co-locate `.css` next to a component** — it lives in `styles/components/`, so styling has exactly one home.

## Docs

- `OVERVIEW.md` — the mental model. **Read it first.**
- `SIMULATION.md` — the deferred sim + application layer. Skip it unless that work is back on.
- `src/styles/THEME.md` — what each colour is allowed to mean. Read before spending one.
- `../SlopBopSimulator/_DOCS/_INFRA/` — cross-repo contract (backend API, Mongo shapes). Read before any change that touches the backend's shape.

**No per-feature doc files, and no file inventories in this one** — the code and the service types are the detail, and they don't desync. (`src/features/map/_CONTEXT.md` and `_TERRAIN_OPEN_QUESTION.md` are the exception, and only while the sim's code is frozen.)
