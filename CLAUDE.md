# QuizWizz Frontend

A party quiz game. One television and everyone's phone, in the same room.

`FRONTEND-ARCHITECTURE.md` is the wire contract and `FRONTEND-DESIGN.md` is the two views —
**read the architecture one first**; this file is the orientation map for working in the code.
`FRONTEND-QUIZZES.md` is the build spec for the quiz rounds, and assumes both.

## The shape of it

**Two clients, one server, and the server is the only thing that knows the truth.** Both views
render what they are told and send intents. Never compute a score, never judge a deadline, never
decide who won.

| | Host | Player |
|---|---|---|
| Device | Laptop on a TV, fullscreen | Everyone's own phone |
| Routes | `/` password gate → `/host` | `/play` join → `/play/game` |
| Reads | `view:display` — the show | `view:player` — its own board |
| Sends | `host:command` (Space, or the admin panel) | answers, inputs, reactions |

There is no admin view. The host *is* the admin — it receives the display projection and is the
only client allowed to send commands.

Three HTTP doors (`/quizwizz/host/login`, `/session`, `/join`) mint a token; **everything after
them is one WebSocket**. The token is re-checked on every connect, so reconnection is not a feature
with code of its own: you reconnect, you re-authenticate, you get a full `session:snapshot`, you
repaint. That is why nothing is cached and there is no resume protocol.

## Code layout

- **`src/services/quizwizz/`** — the only folder that talks to the game server. `protocol.ts` and
  `config.ts` are **copied verbatim** from the server repo (`rubian-server/src/quiz-wizz/`) and must
  never be edited here; copy them again when the server's change. Never type an event name, a
  refusal reason, or an emoji list — import it. A drifted protocol file is the one bug that produces
  silence rather than an error.
- **`src/services/arweave/`** — gateway-failover media loading. Nothing uses it yet; kept because
  QuizWizz will want images and this already solves it.
- **`src/hooks/<domain>/`** — hook per job, grouped like `services/`, with a same-named barrel.
  Import through the barrel, never the file. `useResource.ts` and `useViewMode.ts` sit at the root
  because they belong to no domain.
- **`src/features/host/` and `src/features/player/`** — one folder per *view*, not per route. The
  host is `/host`; the player is `/play` (the door, in `player/join/`) and `/play/game`. Each holds
  a page and the scenes it switches between. `features/home/` is the one exception and is neither:
  the `/` password gate renders `auto` because the host might open it from a phone.
- **`src/components/host/` and `src/components/player/`** — blocks that only one view can use. A
  game zone, a QR panel, a podium and confetti are three metres away; a reaction bar and the
  identity header are in a hand. Neither folder may import from the other, and no page may import
  across the seam — if something is reaching over it, it belongs one level up.
- **`src/components/`** (the root) — only what is genuinely the same object on both screens:
  `<Avatar>`, `<Leaderboard>`, `<EmojiStream>`, `<RoomCode>`, `<Wordmark>`, `standings.ts`. The bar
  for putting something here is that a television and a phone want *the same component*, not merely
  a similar one; two props of divergence is the most that should ever be needed to bridge them.
- **`src/primitives/`** — presentation only, no domain shape. If it encodes a product concept, it
  is a `components/` block.
- **`src/games/registry.ts`** — the round formats. Empty so far; see "Adding a game" below.

No app-wide providers and no context. The session is a module-scope observable
(`services/quizwizz/store.ts`) that React reads with `useSyncExternalStore`, so the socket — which
is not React — and the components share one truth without anything wrapping the tree.

## The session

**One store, `services/quizwizz/store.ts`**: a reducer over server messages and nothing else. Every
field in it was put there by the server. Never mirror it into component state — a copy is a thing
that can disagree.

- **`socket.ts` is the only writer.** It also owns the reconnect backoff, the clock handshake, and
  the **no-retry table** — the refusals (`player_kicked`, `invalid_token`, `session_ended`…) that
  must never be retried, because retrying is an infinite loop against a server that will never say
  yes. Feature code handles none of this.
- **`identity.ts` is all `localStorage` holds**: a token, a playerId, and which game they are for.
  Not game state — every bit of that arrives in the snapshot. The stored `code` is what tells "I am
  already in this game" from "I hold a pass to a game that is over".
- **Frames carry a monotonic `rev`;** drop anything lower than the last one rendered. Frames are
  complete, never patches, so a dropped one costs nothing.
- **Deadlines are absolute server timestamps.** Count down locally against `serverNow()` from
  `clock.ts`, never `Date.now()`, and never send a timestamp expecting it to be believed.

## The two views

`data-view` on `<html>`, set by whichever page is mounted (`hooks/useViewMode.ts`), switches the
whole layout in `styles/index.css`. A page declares what it *is*; nothing measures anything, and
there are no breakpoints.

- **`host`** — the whole viewport, never scrolls. Three fixed slices: leaderboard | **game zone** |
  admin panel. Only the middle changes, which is why the panels never re-mount. Every scene renders
  through `<GameZone>` (a line at the top, the thing in the middle, a line at the bottom) so a scene
  supplies content and never layout. Design for three metres away.
- **`player`** — a 430px strip, full height, tap-tuned. A `<PlayerHeader>` that never moves, an
  occasional status strip, and one scene below. Design it like a gamepad, not a screen someone
  watches.
- **`auto`** — centred, for the one screen that must read on both.

**One `<Avatar>` component.** It is the only thing allowed to look inside an avatar, because the
wire type is a tagged union and photos are a planned second member.

## The four phases

```
LOBBY → GAME → RESULTS →┐        LOBBY    engine — waiting to start
          ↑              │        GAME     the module — a whole game, end to end
          └──────────────┤        RESULTS  engine — the awards land, "next up X"
                         ↓        FINAL    engine — podium
                       FINAL
```

**`phase === 'GAME'` is the only branch either view makes.** Three phases belong to the engine and
one belongs to a module; that is the whole distinction, and it is a string equality test. There is
deliberately no `isIntermission()` helper and no table of phase kinds — the question "is a round
happening" *is* the phase.

- **`GAME`** → `<PlayerGame>` / `<HostGameScene>`: look the module up by `view.gameId` and hand it
  the frame. **No reaction bar on the phone** — eight people mashing 🔥 under a question they are
  meant to be answering is a distraction the host cannot switch off.
- **anything else** → `<PlayerIntermission>` / the engine's own host scenes: standings, and the
  reaction bar is back.

`<ReactionBar>` is mounted by `<PlayerIntermission>` and by nothing else, so "no reactions during
play" is a fact of the component tree rather than a rule to remember.

**A game owns its own intro, rules and reveal.** That is why `ROUND_INTRO` and `ROUND_RESULTS` are
gone: one `rules?: string` was never going to serve a drawing round and a buzzer race. `SCOREBOARD`
is gone because the standings are in the host's left panel from the first join to the podium.

**The deadline rides on `ViewFrame`, not on the phase** (`state.view.deadline`). A game runs its
intro, its questions and its reveals inside one `GAME` phase, so a deadline hung off the phase could
only be set once per game. One frame at a time still means one deadline at a time, and `rev` already
protects it.

**The server ranks; we only sort.** `rank` and `previousRank` arrive on every `PublicPlayer` —
`components/standings.ts` orders by them and never computes them. That is what replaced diffing the
last `totals` we saw, which produced no movement arrows at all for a phone that reconnected
mid-animation.

The server has since applied the phase redesign, so this half is no longer ahead of it — the copy
now runs **server → client**, as `services/quizwizz/` says. Re-copy `protocol.ts` whenever the
server's changes; a drifted copy is the one bug that produces silence rather than an error.

## Adding a game

One server folder, two React components, one line in `src/games/registry.ts`. Nothing else in either
codebase is touched — **that property is the architecture; protect it.** A game is handed its state,
the roster, the deadline and two senders, so it never reaches for the socket or the clock. An
unknown `gameId` renders a placeholder, never a crash.

## Styling

1. **Tailwind inline in TSX** — the default. Layout, spacing, one-off structure.
2. **`src/styles/`** — animations, stateful selectors, and anything with real visual identity.
   `theme.css` holds the tokens (swap ~10 palette values to retheme); `components/*.css` is one file
   per component, `@import`ed by `index.css`. Use the tokens, never raw values.

Reach for Tailwind first. **Never co-locate a `.css` file next to a component.** Animate `transform`
and `opacity` only — the emoji field and the confetti run while the whole room is watching.

`src/styles/THEME.md` says what each colour is allowed to mean. Read it before spending one.

## Environment

`VITE_API_URL` (the game server) and `VITE_WS_URL` (optional; derived from the API base). Copy
`.env.example` to `.env.local`. For testing with real phones, point both at the machine's **LAN IP**
— a phone resolving `localhost` resolves itself — and the server's `ALLOWED_ORIGINS` must contain
the origin or the socket upgrade is refused with nothing visible to debug.

## Heritage

This repo began as a fork of a music-label frontend, kept for its styling system and primitives.
That code is gone; what remains of it is `styles/`, `primitives/` and `services/arweave/`. If
something in those looks like it belongs to another product, it probably did — delete it rather
than building around it.
