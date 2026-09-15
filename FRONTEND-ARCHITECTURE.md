# QuizWizz — Frontend Architecture

The client half of the contract: the folder that talks to the server, the three HTTP doors, the
socket protocol, and the rules that keep the two sides honest.

The other half of the frontend spec is [FRONTEND-DESIGN.md](FRONTEND-DESIGN.md) — the two views,
the wireframes, the components. **Read this one first**; the design doc assumes the data flow
described here.

This document is written to be taken into a fresh repo. Nothing here needs access to the backend
source — but **copy two files across verbatim** and treat them as the single source of truth:

| From the server repo | Into the frontend |
|---|---|
| `src/quiz-wizz/protocol.ts` | `src/engine/protocol.ts` |
| `src/quiz-wizz/config.ts` | `src/engine/config.ts` |

Both are dependency-free TypeScript. Never retype an event name, a reason string, or the emoji
lists — import them. When the server's copy changes, copy it again; a drifted protocol file is the
one bug that produces silence rather than an error.

Companion documents: [QUIZWIZZ-SYSTEM.md](QUIZWIZZ-SYSTEM.md) for the whole system,
[quizzes/](quizzes/) and [minigames/](minigames/) for the round formats.

---

## 1. Repo shape

Vite + React + TypeScript. One app, two routes.

```
src/
├── main.tsx
├── routes/
│   ├── Host.tsx              /host   — password gate, then the show
│   └── Play.tsx              /play   — join form, then the controller
├── engine/                   ← the only folder that talks to the server
│   ├── protocol.ts           COPIED from the server. Do not edit.
│   ├── config.ts             COPIED from the server. Do not edit.
│   ├── api.ts                the three HTTP doors
│   ├── socket.ts             connect, re-auth, reconnect, heartbeat
│   ├── clock.ts              offset handshake + serverNow()
│   ├── store.ts              one reducer over server messages
│   └── identity.ts           localStorage: token + playerId only
├── ui/
│   ├── Avatar.tsx            THE one place an avatar is rendered
│   ├── TimerBar.tsx          shrinking bar, driven by serverNow()
│   ├── EmojiLayer.tsx        host-only particle field
│   ├── ReactionBar.tsx       phone-only, 8 buttons
│   └── tokens.css            design tokens, type scale, safe areas
└── games/
    ├── registry.ts           gameId -> { Display, Player }
    └── <game-id>/
        ├── Display.tsx       what the TV shows
        └── Player.tsx        what the phone shows
```

Env: `VITE_API_URL` (e.g. `https://api.example.com`) and `VITE_WS_URL`
(`wss://api.example.com/quizwizz/socket`). For local testing point them at the machine's **LAN IP**,
not `localhost`, or phones can't reach the server.

Deployment: Vercel. The server's `ALLOWED_ORIGINS` must contain the deployed origin or the WebSocket
upgrade is rejected with no visible error. `localhost`, `127.0.0.1` and `192.168.*` are already
allowed for development.

---

## 2. HTTP — the three doors

Everything after these is the socket. Base path `/quizwizz`.

### `POST /quizwizz/host/login`

```jsonc
// request
{ "password": "…" }

// 200
{ "success": true, "token": "eyJ…", "sessionId": "uuid",
  "code": "GH7K", "joinUrl": "https://play.example.com/play" }
```

Resumes the live session if one exists, so a reloaded host tab lands back in the running game rather
than starting a new one. Store the token in `localStorage` and reuse it.

Refusals: `401 bad_password`, `503 not_configured` (the server has no host password set).

### `GET /quizwizz/session`

```jsonc
{ "success": true, "live": true, "code": "GH7K", "phase": "LOBBY", "playerCount": 7 }
```

What the join page asks before it shows a form. `live: false` means no game is running — show "no
game right now" rather than a form that will fail.

### `POST /quizwizz/join`

```jsonc
// request
{ "name": "Ada", "avatar": { "kind": "emoji", "emoji": "🦊" } }

// 200
{ "success": true, "token": "eyJ…", "playerId": "uuid",
  "name": "Ada", "avatar": { "kind": "emoji", "emoji": "🦊" },
  "sessionId": "uuid", "code": "GH7K" }
```

No room code to type — there is one live session and the QR code is the invitation.

**The returned `name` may differ from what was sent.** It is trimmed, and suffixed on collision
(`Ada` → `Ada 2`). Render what comes back, not what was typed.

Refusals, all `400` unless noted, all shaped `{ "error": "…", "reason": "…" }`:

| `reason` | What the form does |
|---|---|
| `name_required` | Highlight the nickname field |
| `name_too_long` | Highlight it; cap the input at `NAME_MAX_LENGTH` (14) so this never happens |
| `name_rejected` | "Pick a different name." Don't explain the filter |
| `avatar_required` | Highlight the picker — nothing was selected |
| `avatar_rejected` | The picker sent something off-list. A bug; log it |
| `session_full` | The room is at `MAX_PLAYERS` (40) |
| `no_live_session` | `409`. Back to "no game right now" |
| `not_configured` | `503`. The server isn't set up |

---

## 3. WebSocket

### Connecting

```
wss://<api-host>/quizwizz/socket?token=<the token from HTTP>
```

The token goes in the query string, and it is checked **on every connect**, not just the first. That
is the whole reconnection design: there is no resume handshake, no replay. You reconnect, you
re-authenticate, you receive a full `session:snapshot`, you repaint. Write it once and it works for
the first connect and the fortieth.

Every frame both ways is `{ "type": "…", "payload": { … } }`.

### Reconnecting

Reconnect with backoff (0.5s, 1s, 2s, 4s, capped at 5s) plus jitter. Reconnect on `close`, on
`error`, and on `visibilitychange` when the tab comes back — a backgrounded phone often has a socket
that is dead without having fired `close`.

**Some failures must not be retried.** Retrying them is an infinite loop against a server that will
never say yes:

| Arrives as | Meaning | Client does |
|---|---|---|
| `kicked` | The host removed you | Clear identity, show "you're out", **stop** |
| `error` `player_kicked` | Same, on a reconnect attempt | Clear identity, **stop** |
| `error` `invalid_token` | The session is gone or the token is junk | Clear identity, back to join, **stop** |
| `error` `token_expired` | Older than 12h | Clear identity, back to join, **stop** |
| `error` `unknown_player` | Not on the roster | Clear identity, back to join, **stop** |
| `error` `session_ended` | The game is over | Show the final state, **stop** |
| `close` for any other reason | Network | Reconnect with backoff |

The server pings every 25s and terminates a socket that doesn't answer. Browsers answer
automatically — nothing to implement, but it's why a dead connection is noticed within ~50s.

### Clock sync

Deadlines are absolute **server** timestamps, shipped once. Clients count down locally. Without an
offset handshake, countdowns visibly disagree from phone to phone.

On connect, fire five pings a few hundred ms apart and keep the sample with the lowest round trip:

```ts
// send
const t0 = Date.now();
send('sync:ping', { t0 });

// on sync:pong { t0, tServer }
const t1 = Date.now();
const rtt = t1 - t0;
const offset = tServer + rtt / 2 - t1;   // keep the offset from the lowest rtt

export const serverNow = () => Date.now() + offset;
export const remaining = (deadline) => Math.max(0, deadline.endsAt - serverNow());
```

`session:snapshot` carries `tServer`, so seed a rough offset from it immediately and refine with
pings. Re-run the handshake on every reconnect.

**Never send a timestamp expecting it to be believed.** The server measures elapsed time from its own
receive clock. It accepts submissions up to `SUBMIT_GRACE_MS` (250ms) past the deadline and clamps
the recorded time, so keep the submit button live until the deadline passes — don't disable it early
to be safe.

### Server → client

| Event | To | Payload | Render |
|---|---|---|---|
| `session:snapshot` | both | the whole moment (see below) | Repaint everything |
| `session:phase` | both | `{ phase, gameIndex, gameCount, game, upNext }` | Switch scene; mount or tear down the module |
| `view:display` | **host** | `ViewFrame` | Hand `state` to `<Display>` |
| `view:player` | **player** | `ViewFrame` | Hand `state` to `<Player>` |
| `roster:update` | both | `{ players: PublicPlayer[] }` | Tiles, standings, connection dots |
| `react:burst` | **host** | `{ items: [{ playerId, emoji }] }` | Spawn particles |
| `answer:ack` | player | `{ itemId, accepted, reason? }` | Confirm or unlock the UI |
| `score:update` | both | `{ entries, totals }` | The `RESULTS` payout list |
| `sync:pong` | both | `{ t0, tServer }` | Clock offset |
| `kicked` | player | `{}` | See the no-retry table |
| `error` | both | `{ reason, message }` | See the no-retry table |

`PublicPlayer` is `{ id, name, avatar, connected, score, rank, previousRank }`. **Ranks come from
the server** — 1-based, gapless, ties by join order — so no client works out its own placings and
the movement arrows survive a reconnect. See [PHASE-REDESIGN.md](PHASE-REDESIGN.md) §3.2.

`ViewFrame` is `{ runId, gameId, rev, state, deadline }`.

`session:snapshot`:

```ts
{
  sessionId, code,                    // the code goes on the TV
  phase, gameIndex, gameCount,
  game,                               // { runId, gameId, title } | null
  upNext,                             // { gameId, title } | null — null means FINAL is next
  players,                            // PublicPlayer[]
  view,                               // this client's own ViewFrame | null — and its deadline
  you,                                // { playerId, name, avatar, score } | null — players only
  tServer,
}
```

**`rev` is monotonic across the whole session.** Keep the last `rev` you rendered and drop any frame
with a lower one. Frames are always complete — never patches — so a dropped frame costs nothing.

**There is exactly one deadline at a time**, and it lives on `ViewFrame` — not on the phase. A game
runs its intro, its questions and its reveals inside one `GAME` phase, so a deadline attached to the
phase could only be set once per game; on the frame it is per-step, and it inherits the stale-frame
rule for free. `LOBBY`, `RESULTS` and `FINAL` are host-paced and have no deadline at all. One timer
component, one source.

### Client → server

| Event | From | Payload |
|---|---|---|
| `sync:ping` | both | `{ t0 }` |
| `player:react` | player | `{ emoji }` — must be from `EMOJI_PALETTE` |
| `player:leave` | player | `{}` — quit for good; **removes**, never greys out |
| `player:answer` | player | `{ runId, itemId, choice }` |
| `player:input` | player | `{ runId, seq, type, payload? }` — minigames |
| `host:command` | host | `{ cmd, args }` |

Always include the current `runId` — one playthrough of one game, straight off the frame that
projected the controls. A submission for a finished game comes back as
`answer:ack { accepted: false, reason: 'stale_run' }`.

**`player:leave` is the one thing a closing socket cannot say.** A dropped connection and a
deliberate quit are the same event at the transport layer, and silence has to mean the first one: a
phone in a pocket goes `connected: false`, keeps its score and its place, and repaints on reconnect.
That is the behaviour to protect, so the other case gets a message of its own. On receipt the server
**removes the player from the session** — gone from `players`, gone from the standings, ranks
recomputed — broadcasts a `roster:update` without them, invalidates their token and closes their
socket. A stale tab still holding that pass reconnects into `error unknown_player`, which is already
a no-retry ending on the client. Rejoining is an ordinary `/join`: new `playerId`, score at zero,
and the name and avatar they quit to fix. The phone sends it *before* it drops the token, because
after that there is no socket to send it on.

A phone sending `host:command` gets `error wrong_role`. The role is bound to the token, so there is
nothing to spoof — but don't ship the host bundle to `/play` either.

### Host commands

One envelope for all of them. `next` is the spacebar and 90% of the interaction.

Only these belong to the engine. **Anything else is forwarded to the running module verbatim**, so a
game can define `lock`, `revealStep`, `pause` or whatever it likes without touching the protocol.

| `cmd` | `args` | Notes |
|---|---|---|
| `next` | — | Advance. **Bind to Space.** |
| `skipGame` | — | Force-ends the running game with **no awards**, without asking the module. The escape hatch |
| `jumpTo` | `{ gameIndex }` | Deep-link into game N. Invaluable when testing |
| `adjustScore` | `{ playerId, delta, reason }` | Writes an auditable ledger row |
| `kick` | `{ playerId }` | |
| `rename` | `{ playerId, name }` | |
| `setPlaylist` | `{ playlist: [{ gameId, config }] }` | LOBBY only. An unregistered `gameId` is refused here rather than mid-game |
| `endSession` | — | |

A refused command arrives as `error { reason }` — `wrong_phase`, `not_allowed`, `unknown_command`,
`unknown_game`, `malformed_payload`, `unknown_player`. Show it as a toast in the corner; you'll be
operating this while talking to a room.

**During `GAME` the module gets every command first.** If it claims `next` — a multi-step reveal
does exactly this — the phase does not advance and you get a fresh `view:display` instead. That is
what keeps Space as the only key.

**An unclaimed command during `GAME` is refused `not_allowed`.** The engine has no `next` behaviour
while a game is running, and a game that ends because its module forgot to claim a key is a game
that ends early in front of the room. A game ends when it calls `finish(awards)` and at no other
time; `skipGame` is the escape hatch that makes refusing the rest safe.

---

## 4. Adding a game — the client contract

**One server folder, two React components, one registry line.** Nothing else in either codebase is
touched. That property is the whole point of the architecture; protect it.

```ts
// games/registry.ts
export const GAMES: Record<string, GameComponents> = {
  'quiz-deathmatch': {
    Display: lazy(() => import('./quiz-deathmatch/Display')),
    Player:  lazy(() => import('./quiz-deathmatch/Player')),
  },
};
```

Both views look the component up by `view.gameId` and render it inside the `GAME` shell. An unknown
`gameId` renders a placeholder, never a crash — the server refuses unknown games when the playlist
is set, so this only happens mid-development.

**A module owns the whole of `GAME`** — its title card, its rules screen, its play and its reveal.
The engine used to own three of those as separate phases and hand over only the middle one, which
meant every format had to be shaped like a quiz. It owns all of them now, and that is the point:
`rules?: string` is gone because one paragraph of plain text was never going to open a drawing round
and a buzzer race.

The props are fixed, so a game never touches the socket or the clock:

```ts
interface DisplayProps<S> {
  state: S;                       // the toDisplay projection
  players: PublicPlayer[];
  deadline: Deadline | null;      // this step's, off the frame. null = untimed
  serverNow: () => number;
}

interface PlayerProps<S> {
  state: S;                       // the toPlayer projection — this phone's only
  you: { playerId: string; name: string; avatar: Avatar; score: number };
  deadline: Deadline | null;
  serverNow: () => number;
  answer: (itemId: string, choice: unknown) => void;
  input: (type: string, payload?: unknown) => void;
}
```

`state` is `unknown` to the engine and typed per game. Declare the type next to the components and
keep it identical to what the server module projects — that pair of types is the real contract for a
round.

---

## 5. Avatars on the wire

A player's avatar rides in every payload that names a player — `PublicPlayer.avatar`,
`snapshot.you.avatar`, and the join response. It is a **tagged union, not a string**:

```ts
type Avatar = { kind: 'emoji'; emoji: string }
```

A union of one looks odd until the second member arrives — photos are planned as
`{ kind: 'image'; url; width; height }`. The point of the union is that adding them touches one
component instead of every render site, which is why exactly one component in the app is allowed to
look inside an avatar. See [FRONTEND-DESIGN.md §3](FRONTEND-DESIGN.md) for that component and the
picker.

The server refuses a join whose avatar is missing (`avatar_required`) or off-list
(`avatar_rejected`) rather than substituting a default, so a picker bug surfaces on the first join
instead of giving fifteen people the same face.

---

## 6. The rules that are load-bearing

Break one of these and it fails on game night rather than in development.

- **Never type an event name, reason, or emoji list.** Import from the copied `protocol.ts` /
  `config.ts`.
- **Never compute a score, and never compute a rank.** Both arrive on `PublicPlayer`, folded by the
  server from its own ledger. A client-held score is a client-editable score, and this runs on the
  guests' own phones.
- **`phase === 'GAME'` is the only phase test either view makes.** Three phases belong to the engine
  and one belongs to a module; anything finer — a table of phase kinds, an `isIntermission()` — is
  the client re-deriving something the phase already says.
- **`localStorage` holds identity only** — token, playerId, and the host token. Nothing else. It is
  not a cache of game state.
- **Drop stale frames by `rev`.** Frames are complete; never merge them.
- **A phone renders `view:player` and nothing else.** If a design needs data the phone doesn't have,
  that is the server's `toPlayer` to change — not something to infer. The correct answer is *absent*
  from the payload before the reveal, not hidden in it.
- **One deadline, one timer component**, read off `view.deadline` and driven by `serverNow()`.
- **Re-authenticate on every connect** and repaint from the snapshot. No resume protocol.
- **Don't retry a refusal** from the no-retry table in §3.
- **One `<Avatar>` component.** Nothing else looks inside an avatar.
- **Don't deploy while a game is live.** Put a banner in the host chrome when a session is running;
  you will otherwise do it anyway.

