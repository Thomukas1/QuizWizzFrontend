# QuizWizz — Building the Quiz Rounds

The client half of the quiz formats. `CLAUDE.md` is the orientation map and
`FRONTEND-ARCHITECTURE.md` is the wire contract — **read those first**; this
document assumes both and only covers what a quiz adds.

Server counterparts, in `rubian-server/src/quiz-wizz/`:
[`_CONTEXT.md`](../rubian-server/src/quiz-wizz/_CONTEXT.md) ·
[`_DOCS/quizzes/README.md`](../rubian-server/src/quiz-wizz/_DOCS/quizzes/README.md) ·
[`_DOCS/quizzes/01-warmup.md`](../rubian-server/src/quiz-wizz/_DOCS/quizzes/01-warmup.md)

---

## What already exists

Almost all of the plumbing. Read this section before planning anything, because
the temptation is to rebuild things that are already here:

| | Where | State |
|---|---|---|
| Game registry + props contract | `src/games/registry.ts` | Done. `GAMES` is `{}` |
| Game mount points | `HostGameScene.tsx`, `PlayerGame.tsx` | Done. Look up by `gameId`, hand over the frame |
| `rev` gating, whole frames | `services/quizwizz/store.ts` | Done |
| Clock offset, `serverNow()` | `services/quizwizz/clock.ts` | Done |
| Countdown ticker | `hooks/quizwizz/useCountdown.ts` | Done — but nothing renders a bar yet |
| `answer:ack` → `state.ack` | `store.ts` | Done, with a `seq` to spot a repeat |
| Answer / input / react senders | `hooks/quizwizz/usePlayerActions.ts` | Done |
| Space → `next` | `hooks/quizwizz/useSpaceToAdvance.ts` | Done |

**So the work is: one contract copy, two small additions to `clock.ts`, a
`<Timer>`, a quizkit component folder, two warmup components, one registry
line — and a playlist control, which is the blocker.**

---

## 0. The blocker: there is no playlist

`engine.createSession()` takes no argument, so `session.playlist` is `[]`, and
`LOBBY.next` reads `playlist.length ? 'GAME' : 'FINAL'`. **Pressing Space in the
lobby today jumps straight to the podium.** Nothing below is reachable until the
host sends `setPlaylist`.

It is `LOBBY`-only — refused `wrong_phase` anywhere else — and unknown game ids
are refused `unknown_game` there rather than at the transition, so a typo
surfaces before the party rather than in front of it.

```ts
send({ type: 'host:command', payload: {
  cmd: 'setPlaylist',
  args: { playlist: [{ gameId: 'quiz-warmup', config: { content: 'warmup-01' } }] },
}});
```

`src/styles/components/admin-panel.css` already reserves a row for a playlist
control, so `components/host/AdminPanel.tsx` is where it belongs. A single
"Load warmup" button unblocks everything; a real picker can wait until there is
more than one game to pick.

---

## 1. Copy the contract

**`protocol.ts` only.** `config.ts` is byte-identical to the server's and needs
nothing.

```
rubian-server/src/quiz-wizz/protocol.ts  →  src/services/quizwizz/protocol.ts
```

Two changes, both of which will surface as type errors:

- **`Deadline` has a third field, `kind: TimerKind`** (`'prepare' | 'live' |
  'lastChance' | 'beat'`). Anything constructing a `Deadline` with two fields
  stops compiling.
- **`QuizWizzReason` gained `already_answered`.** An exhaustive switch over
  reasons will need the case.

> The ⚠️ note at the bottom of `CLAUDE.md` — "`protocol.ts` here is ahead of the
> server" — is **stale**. The server applied the phase redesign and has since
> moved ahead; this copy makes the client current. Delete that warning while you
> are there.

### The two view contracts

These are new files, copied the same way, and they are why nothing here has to
guess at the shape of `view.state`:

```
Games/quizkit/view.ts       →  src/games/quizkit/view.ts
Games/quiz-warmup/view.ts   →  src/games/quiz-warmup/view.ts
```

The server's folder layout is mirrored deliberately: a game is one folder on
each side, and its `view.ts` is the contract between them.

### What is *not* copied

The server has `Tools/timer.ts`, and it is **not** a file to copy, even though
its own header used to say so. `clock.ts` here already owns the same arithmetic
with `serverNow()` baked into every call — better ergonomics on a client, since
a component has no business passing `now` around. Copying it would leave two
sets of countdown functions where the entire point is to have one.

What crosses is its **rules**, in step 2.

---

## 2. Two additions to `clock.ts`

`remaining()` and `fractionLeft()` already exist. Add the two rules the server
encodes that this file does not:

```ts
/**
 * The digit a television reads out. **Ceiling, not floor** — a clock with 200ms
 * left still shows `1`, and reaches `0` only when it is genuinely over.
 * Flooring shows `0` for the whole final second, which is a second of the room
 * believing it is too late while the server is still accepting answers.
 */
export const secondsLeft = (deadline: Deadline | null): number =>
  Math.ceil(remaining(deadline) / 1000);

/** Whether this clock is one the room is meant to be watching. */
export const isVisible = (deadline: Deadline | null): boolean =>
  !!deadline && deadline.kind !== 'beat';
```

Both are re-exported by the `services/quizwizz.ts` barrel automatically.

---

## 3. `<Timer>` — a tool, not a quiz component

`src/components/Timer/`, at the **root** of `components/`, not under `games/`.

That placement is the whole design and `CLAUDE.md`'s bar for the root folder is
met exactly: a television and a phone want the *same component*. A quiz counts
down a question with it; a reaction minigame counts down sixty seconds of
popping balloons with it; neither knows about the other. The server calls this
distinction **kits and tools** — a kit is game-shaped and only some games want
it, a tool knows nothing about any game.

It reads `deadline` from props (the frame's, handed down by the mount point) and
drives `useCountdown`. **It branches on `kind`, never on a step id** — branching
on step is what would silently make it quiz-only:

| `kind` | Render |
|---|---|
| `prepare` | A lead-in. "Get ready" — no race, no urgency, no pressure to act |
| `live` | The main event. The biggest thing on screen |
| `lastChance` | Short and urgent. Everyone else is already in |
| `beat` | **Nothing.** `isVisible()` is false — a drumroll is not a clock |

Two things that will bite:

- **Re-key on deadline identity** (`startedAt`-`endsAt`-`kind`). The auto-lock
  truncates a live clock to a `lastChance` one, and without a key change a CSS
  transition animates that as a smooth glide instead of the snap it is.
- **Do not stop input at zero.** The server accepts up to `SUBMIT_GRACE_MS` past
  `endsAt` and clamps the recorded time — the grace exists so players on slow
  connections are not robbed, and the clamp makes sure it buys them nothing.
  `useCountdown` already documents this.

The words are the client's on purpose. The server ships no label: "Get ready" is
copy, and copy belongs to the side with the fonts, the room to put it, and the
language to say it in.

---

## 4. Stop here and check

Before building any quiz UI, register the warmup with a component that renders
`<pre>{JSON.stringify(state, null, 2)}</pre>`, load the playlist, and press
Space.

You should watch `step` go `intro → open → locked → reveal`, `deadline.kind` go
`prepare → live → beat → null`, `answered` fill up, and `reveal` flip from
`null` to an object. **If that works, everything after it is layout.** Debug the
transport here rather than inside a component with a half-built reveal.

---

## 5. `src/games/quizkit/` — the shared mechanic

Shared by all four quiz formats, which is what makes formats 2–4 a folder and a
row rather than a rewrite. These are `games/`-scoped blocks, not root
`components/`: they encode a product concept (a question, an option, a tally)
and only quizzes want them.

| Component | Shows | Notes |
|---|---|---|
| `<OptionButtons>` | Phone. 2–4 tap targets, letter + label | Use `MIN_OPTIONS`/`MAX_OPTIONS` from the copied `view.ts` |
| `<OptionGrid>` | TV. The same letters, large | Same order as the phone, always |
| `<MediaStrip>` | `item.media`, 0–2 | Empty on every item today — build the slot |
| `<AnsweredTiles>` | TV. A tile per player, lit on submit | Maps `answered` ids against the roster |
| `<LockedInCount>` | "12 / 15 locked in" | See the rule below |
| `<RevealBars>` | The per-option split | `counts` has every key, zeroes included |

### `<LockedInCount>` — use `expected` from the frame

```tsx
<span>{state.answered.length} / {state.expected} locked in</span>
```

**Do not compute the denominator from the roster.** `players.filter(p =>
p.connected).length` looks equivalent and is the bug: `expected` is the exact
number the server's auto-lock fires on, so a second copy of that rule drifts —
and it drifts *visibly*. Count everyone and the TV reads "12 / 15" at the
precise moment the clock cuts short for 12 of 12 present, which the room reads
as the timer breaking rather than as three people having their phones in their
pockets.

Same reasoning as `ReactionOption` in `protocol.ts`: the rule for what the
server does lives on the server, and the client is told the answer.

### Media, and what it will eventually be

`media` is `[{ kind: 'image'; url; alt? }]`, capped at two, and **empty on every
item today** — nothing hosts the bytes yet. Build the slot now so images are a
content change rather than a refactor.

`src/services/arweave/` already solves gateway-failover loading and
`primitives/Img.tsx` and `hooks/arweave/` sit on top of it. That is almost
certainly where this lands: a stored Arweave url names one gateway, and a bare
`<img src>` on it bets the round on that host being up. `<MediaStrip>` should go
through `useArweaveImage` rather than a raw `src` for exactly that reason.

---

## 6. `src/games/quiz-warmup/` — the format

Three files: `view.ts` (copied in step 1), `Display.tsx`, `Player.tsx`.

The full format spec is
[`01-warmup.md`](../rubian-server/src/quiz-wizz/_DOCS/quizzes/01-warmup.md) —
read it for the intent. Its job is a dopamine hit and teaching the interface,
so nothing here should be clever; every twist in formats 2–4 lands harder
because this one had none.

### The step machine

Both components switch on `WarmupStep`. These are the literal `step` values on
the wire:

```
intro    1.5s   prompt on the TV, buttons dead        deadline.kind = 'prepare'
open     30s    buttons live, tiles lighting up       deadline.kind = 'live'
                auto-locks once everyone is in        → 'lastChance'
locked   ~1s    buttons dead, drumroll                deadline.kind = 'beat'
reveal   host   one step, no drama needed             deadline = null
```

### `Display.tsx`

`WarmupDisplayView` from the copied `view.ts`. Standard layout — prompt
dominant, options below it lettered to match the phone, answered-tiles along the
bottom.

- **Item counter is `itemIndex + 1` / `itemCount`.** Guard `itemIndex === -1`,
  which means an opening or closing stage with no item up. The warmup has
  neither, but Match-3 does and this component should not be the thing that
  learns that the hard way.
- **`reveal` is `null` until its step.** When it lands: correct option green,
  others dim, `counts` as bars, `explain` if the item has one, and a `+1` flyup
  on every tile in `scorers`.
- It renders inside `<GameZone>`, so it supplies content and never layout, and
  inherits the emoji field and the three-row frame for free.

### `Player.tsx`

`WarmupPlayerView`. **Buttons only — no prompt.** That is a design rule rather
than a shortcut: the question stays on the TV so everyone's eyes stay up and the
room stays social, and it means a phone's payload has nothing in it worth
opening devtools for. The correct key is never in a player frame in any form, at
any step.

State comes off the frame, not off component state:

| Frame says | Phone shows |
|---|---|
| `open && !yourChoice` | Live buttons |
| `yourChoice !== null` | **Locked in.** That field *is* the locked state — do not track it separately |
| `!open && !yourChoice` | Waiting / dead buttons |
| `step === 'reveal'` | `outcome`: `correct` / `wrong` / `missed` |

**`yourScore` is the footer** — points this game so far, already multiplied.
Render it, don't derive it: the per-answer rate is server config that never
crosses the wire, so a phone computing its own total would be a client computing
a score.

It counts **only items whose answer has already been shown**, which is why it
can sit on screen during a live question without leaking anything. Expect it to
stay put when a player answers and to tick up on the reveal — that is correct,
not lag, so don't smooth it or animate it optimistically.

### Tapping: pending, then locked

`usePlayerActions` deliberately holds no optimistic state, and the registry's
prop comment says to wait for `answer:ack` before showing a choice as locked in.
That rule is right and this does not break it — but a 30-second question on bad
hotel wifi must not feel dead for a round trip, so use **three** states, not
two:

1. **Tap** → disable every button, mark that key *pending*. Not "locked in" —
   pending. Nothing claims the server took it.
2. **`state.ack`** (or the next frame's `yourChoice`, whichever lands first) →
   confirm as locked in.
3. **A refusal that is not `already_answered`** → release the buttons.

Watch `ack.seq`, not the ack's contents: `store.ts` bumps it per ack so a repeat
of the same refusal is still a new event.

| `answer:ack` reason | Phone says |
|---|---|
| `accepted: true` | Locked in |
| `already_answered` | **"Locked in" — not an error.** The expected reply to a double-tap, or to a resend after a reconnect |
| `too_late` | "Missed that one" |
| `not_allowed` | The buttons were not live. Re-sync from the frame |
| `stale_run` | An answer for a finished game. Drop it silently |

`already_answered` is the one that is easy to get wrong: it is
success-flavoured, and rendering it as an error makes an ordinary double-tap
look like a bug.

---

## 7. One registry line

```ts
'quiz-warmup': {
  Display: lazy(() => import('./quiz-warmup/Display')),
  Player:  lazy(() => import('./quiz-warmup/Player')),
},
```

Lazy, so the join screen is not carrying twelve games it may never play.

---

## 8. The host needs no new keys

Space already sends `{ cmd: 'next' }` and should keep sending it
**unconditionally**. The host UI never learns whether `next` means "next
question", "next reveal step" or "next phase" — during `GAME` the server offers
every command to the running module first and falls through to the engine's own
when the module declines. One key is the entire interaction, at both levels.

The host is always allowed forward, including cutting a live question short when
the room has clearly finished. `skipGame` stays on its own control as the escape
hatch: it force-ends a game with no awards, which is what makes refusing an
unclaimed `next` safe.

---

## The five that will actually bite

1. **No playlist, no game.** Step 0 or nothing else is reachable.
2. **`expected` comes from the frame.** Computing the denominator yourself is a
   visible bug, not a style preference.
3. **`<Timer>` branches on `kind`, never on `step`.** Branch on step and it is
   quiz-only, which defeats the reason it sits in root `components/`.
4. **`already_answered` is success-flavoured.** It means "locked in".
5. **Do not copy `Tools/timer.ts`.** `clock.ts` already has it; copying makes
   two countdowns that can disagree.

## The property to protect

When Deathmatch arrives, the diff should be: copy its `view.ts`, add
`src/games/quiz-deathmatch/{Display,Player}.tsx`, add one row to
`registry.ts`. Nothing in `<Timer>`, nothing in `quizkit/`, nothing in the phase
router, nothing in the store.

Deathmatch is the real test of that, because it is the same three buttons and
the same thirty seconds with a completely different feeling — its whole format
is a five-step reveal, and every one of those steps is a `step` value its own
`Display` switches on. If building it makes you edit a shared file, the seam is
in the wrong place, and moving it is the work rather than a nice-to-have.

The one thing that is *deliberately* not shared is the running score: `yourScore`
is on `WarmupPlayerView`, not on `QuizPlayerBase`, because the warmup pays per
correct answer and Deathmatch pays only the three fastest. Each format projects
its own, and a phone renders whatever number it is handed.
