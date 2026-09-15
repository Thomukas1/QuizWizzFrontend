# QuizWizz — Frontend Design

The two views, what each one shows in every phase, and the components that draw them.

This is the second half of the frontend spec. The first is
[FRONTEND-ARCHITECTURE.md](FRONTEND-ARCHITECTURE.md) — the endpoints, the socket events, and the
data every screen below is rendering. Read that one first; everything here assumes it.

Wireframes are layout and hierarchy, not visual design. They say what goes on screen, how big it is
relative to everything else, and what changes when. Type, colour, motion and sound are yours.

Every list this doc draws from — the eight reaction emoji, the forty avatars, name lengths, rate
limits — comes from the `config.ts` copied out of the server. Import it; don't transcribe it.

---

## 1. The two views

| | Host | Player |
|---|---|---|
| Device | Laptop on a TV over HDMI, fullscreen | Everyone's own phone |
| Orientation | 16:9 landscape, assume 1920×1080 | Portrait, ~390×844 |
| Route | `/host` | `/play` |
| Auth | Admin password → host token | Nickname + avatar → player token |
| Reads | `view:display` — aggregates, reveals, the show | `view:player` — its own board only |
| Job | Render everything: animation, sound, scores, emoji particles | Send intents. Four message types, nothing else |
| Controls | Spacebar | Taps |

**The host is the show.** It renders, animates, plays audio, displays the scoreboard and the podium.
**The phone is a controller** — slim, no sound, no animation beyond button feedback. Design it like
a gamepad, not like a screen someone watches.

**The server is the only thing that knows the truth.** Both views render what they are told and send
intents. Never compute a score, never judge a deadline, never decide who won.

There is no separate admin view. The host *is* the admin: it receives the display projection and it
is the only client allowed to send commands.

---

## 2. Phases — what each view shows

The outer loop. **A game module owns the whole of `GAME`** — its title card, its rules screen, its
play and its reveal.

```
LOBBY → GAME → RESULTS →┐
          ↑              │   the playlist has more games
          └──────────────┤
                         ↓   the playlist is exhausted
                       FINAL
```

| Phase | Host | Player |
|---|---|---|
| `LOBBY` | Room code, QR code, joined tiles filling up | "You're in" + standings + reaction bar |
| `GAME` | `<Display>` — the module's, whole | `<Player>` — their board. **No reaction bar** |
| `RESULTS` | The payout list: who gained what, and why. "Next up — X" | "Scores are in" + standings with movement + reaction bar |
| `FINAL` | Podium | Final standings + reaction bar + a way out |

Three phases belong to the engine and one belongs to a module. That is the only distinction either
view makes, and it is `phase === 'GAME'` — not a table of phase kinds.

`ROUND_INTRO` and `ROUND_RESULTS` are gone because a format's opening and its reveal are part of the
format: one `rules?: string` was never going to serve a drawing round and a buzzer race.
`SCOREBOARD` is gone because the standings are in the host's left panel from the first join to the
podium, so a phase for looking at them was the same list on screen twice. See
[PHASE-REDESIGN.md](PHASE-REDESIGN.md).

Both views must render every phase, including ones they have nothing to say about, and including the
beat before a module's first frame lands. A blank screen mid-party reads as broken — and the first
thing anyone does about it is reload, which on a phone is the one action that actually costs them
their place.

---

## 3. Avatars

A player picks one on the join screen. It is what represents them everywhere: lobby tiles,
scoreboard rows, answer reveals, the podium.

**The wire type is a tagged union, not a string** — see
[FRONTEND-ARCHITECTURE.md §5](FRONTEND-ARCHITECTURE.md) for where it appears in the payloads:

```ts
type Avatar = { kind: 'emoji'; emoji: string }
```

A union of one looks odd until the second member arrives. Photos are planned as
`{ kind: 'image'; url; width; height }`, and the whole point of the union is that adding them
touches one component instead of every render site.

**So: exactly one component ever branches on `kind`.** Nothing else in the app may look inside an
avatar.

```tsx
// ui/Avatar.tsx — the only place that knows an avatar can be text
export function Avatar({ avatar, size }: { avatar: Avatar; size: number }) {
  return (
    <div className="avatar" style={{ '--size': `${size}px` } as CSSProperties}>
      {avatar.kind === 'emoji' && <span aria-hidden>{avatar.emoji}</span>}
      {/* future: avatar.kind === 'image' && <img src={avatar.url} alt="" /> */}
    </div>
  );
}
```

```css
.avatar {
  width: var(--size);
  height: var(--size);
  display: grid;
  place-items: center;
  border-radius: 22%;
  background: var(--avatar-ground);
  font-size: calc(var(--size) * 0.62);   /* the ONLY font size for an avatar, anywhere */
  line-height: 1;
  user-select: none;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
```

Every call site passes a **size in pixels**, exactly as it would to an `<img>` — never a font size.
The outer box is a fixed square with a coloured ground, so an emoji tile and a 512×512 photo are the
same object on screen and no layout moves when photos land.

Give the ground a deterministic colour from `player.id` so tiles are distinguishable when two people
pick the same emoji — that is allowed, and with 40 emoji and 15 guests it happens:

```ts
const hue = [...playerId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
// --avatar-ground: hsl(${hue} 65% 45%)
```

### The picker

`AVATAR_EMOJI` from `config.ts` — 40 emoji, chosen for distinct silhouettes and deliberately
disjoint from the reaction palette so a floating reaction never looks like somebody's face.

Render as a grid that fits a phone without scrolling: 5 columns × 8 rows at ~56px, or 8 × 5 in
landscape. Selection is a ring, not a colour change — colour changes get lost against the emoji.
Nothing is preselected: the server refuses a join with no avatar rather than defaulting one, so that
the picker's bug doesn't become fifteen identical faces.

If you later want taken avatars greyed out, that needs a server change — ask for it rather than
guessing from the roster, which a phone can't see before joining.

---

## 4. Host view — wireframes

Design for **three metres away**. Everything roughly twice the size instinct suggests. Assume
1920×1080 with overscan-safe margins — some TVs still crop the edges.

Three layers, always:

```
┌─────────────────────────────────────────────────────────┐
│ layer 3  chrome: round N of M, refusal toasts, ⚠ banner │
│ layer 2  content: the phase                             │
│ layer 1  background: emoji particles                    │
└─────────────────────────────────────────────────────────┘
```

### Password gate — `/host`

Doubles as the browser gesture that unlocks audio. Chrome silently refuses to play sound before a
click, and you will otherwise think the audio code is broken.

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                     Q U I Z W I Z Z                     │
│                                                         │
│              ┌─────────────────────────┐                │
│              │  password               │                │
│              └─────────────────────────┘                │
│                    [  S T A R T  ]                      │
│                                                         │
│        ⚠ a game is already running — Start resumes it   │
└─────────────────────────────────────────────────────────┘
```

### LOBBY

The QR code matters more than it sounds: typing a URL on 15 phones is where the energy of the
evening dies. Make it scannable from the back of the room.

```
┌─────────────────────────────────────────────────────────┐
│                                            round – of 6│
│   ┌───────────────────┐    JOIN AT                      │
│   │                   │    play.example.com             │
│   │    ███ QR ███     │                                 │
│   │    ███████████    │    CODE                         │
│   │    ███████████    │    ┌───┬───┬───┬───┐            │
│   │                   │    │ G │ H │ 7 │ K │            │
│   └───────────────────┘    └───┴───┴───┴───┘            │
│                                                         │
│   7 PLAYERS IN                                          │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│   │  🦊  │ │  🐙  │ │  🚀  │ │  🐸  │ │  🍕  │          │
│   │ Ada  │ │  Bo  │ │  Cy  │ │ Dee  │ │ Eli  │          │
│   └──────┘ └──────┘ └──────┘ └──────┘ └──────┘          │
│   ┌──────┐ ┌──────┐                                     │
│   │  🦉  │ │  👽  │           ← tiles pop in on join    │
│   │ Fen  │ │ Gus  │                                     │
│   └──────┘ └──────┘                                     │
│                                                         │
│                            SPACE to start ▸             │
└─────────────────────────────────────────────────────────┘
```

The code is display-only — nobody types it. It exists so the room can confirm everyone is in the
same game, and so you have something to say out loud.

### GAME — the opening

The title card is the **module's first step**, not a phase. It looks like this only if the module
draws it this way; a drawing round might open on an example canvas and a buzzer race on a countdown.

```
┌─────────────────────────────────────────────────────────┐
│                                            game 2 of 6  │
│                                                         │
│                     D E A T H M A T C H                 │
│                                                         │
│            Fastest three correct answers score.         │
│                   One life each. Go fast.               │
│                                                         │
│                                                         │
│                            SPACE to begin ▸             │
└─────────────────────────────────────────────────────────┘
```

Space here is claimed by the module, so the phase does not move — the module just projects its next
step. That is the mechanism that lets a format pace its own opening.

**Build the shared opener once.** Every format now has to draw its own title card, and left alone
that is how the fourth game ends up with a worse intro than the first. Ship an opt-in title/rules
component a module renders when it has nothing special to say: a default it can decline, rather than
a phase it has to work around.

### GAME — play

The middle is the game's `<Display>`. Everything around it is yours.

```
┌─────────────────────────────────────────────────────────┐
│ ████████████████████████████░░░░░░░░░░░░  0:12   ← bar  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│            ┌───────────────────────────────┐            │
│            │                               │            │
│            │   <Display state={…} />       │            │
│            │                               │            │
│            │   the question, the grid,     │            │
│            │   the dots — the game's own   │            │
│            │                               │            │
│            └───────────────────────────────┘            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  9 of 15 in   🦊 🐙 🚀 🐸 ✓ ✓ ✓ ✓ ✓ ○ ○ ○ ○ ○ ○        │
└─────────────────────────────────────────────────────────┘
```

The timer is a **shrinking bar, not just digits** — readable at three metres, and it creates pressure
in a way numbers don't. Drive it from `requestAnimationFrame` against `serverNow()`, never from a
server tick.

The progress row is **the module's own projection** — ids only. The engine no longer knows what an
item is, so it cannot count them; a format that wants this row puts `answered` and `total` in its
`toDisplay`. The server never sends what anyone answered before the reveal, so there is nothing to
leak here even by accident.

### GAME — the reveal

Also the module's, and also not a phase. Reveals are often multi-step and paced by Space; the phase
doesn't move, because the module keeps claiming the key.

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                  The answer was  B E R L I N            │
│                                                         │
│      🦊 Ada      ✓  1.2s                                │
│      🐙 Bo       ✓  1.9s                                │
│      🚀 Cy       ✓  2.4s                                │
│      🐸 Dee      ✗  —                                   │
│                                                         │
│                            SPACE to continue ▸          │
└─────────────────────────────────────────────────────────┘
```

**No points on this screen.** The module keeps its own scoring in whatever shape suits it — lives,
streaks, buzzer order — and converts to system points exactly once, when it finishes. Which is the
next screen.

### RESULTS

The module has handed its awards over. The engine writes the ledger, re-ranks everyone, and shows
the payout.

```
┌─────────────────────────────────────────────────────────┐
│                    D E A T H M A T C H                  │
│                                                         │
│      🦊 Ada          1st fastest              +3        │
│      🐙 Bo           2nd fastest              +2        │
│      🚀 Cy           3rd fastest              +2        │
│      🐸 Dee          —                         —        │
│                                                         │
│                     Next up — Emoji Riddles             │
└─────────────────────────────────────────────────────────┘
```

`delta` and `reason` come from `score:update` and are written by the module for exactly this screen
(`"1st fastest"`, `"3 correct"`, `"survived"`). **The reason is not fine print** — it is the only
explanation the room gets for a number.

Not the standings: those are in the left panel and have been all evening, and repeating them here is
precisely what made `SCOREBOARD` redundant. The movement arrows live there too, driven by `rank` and
`previousRank` straight off the wire — no diffing, so a phone that reconnects mid-animation still
shows them.

"Next up — X" is `upNext`. **`upNext: null` means the podium is next**, and saying so is what stops
the room wondering whether the game broke or ended.

### FINAL

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                        ┌──────┐                         │
│              ┌──────┐  │  🦊  │  ┌──────┐               │
│              │  🚀  │  │ Ada  │  │  🐙  │               │
│              │  Cy  │  │  9   │  │  Bo  │               │
│              │  7   │  │      │  │  7   │               │
│              └──────┘  └──────┘  └──────┘               │
│                  2        1         3                   │
│                                                         │
│              4  🐸 Dee 4    5  🍕 Eli 2                 │
└─────────────────────────────────────────────────────────┘
```

### Emoji particles

`react:burst` arrives batched at 10Hz as `{ items: [{ playerId, emoji }] }`.

- Spawn each item at a random x along the bottom, float to the top over 3–4s, drift and fade.
- Cap concurrent particles at ~60 and drop the oldest.
- Animate `transform` and `opacity` only, plus `will-change: transform`. Anything that triggers
  layout drops frames at exactly the moment everyone is watching.
- A burst can carry a dozen items; mount them in one pass, not one state update each.

This is the feature that makes the room feel connected to the screen. It is also the first thing to
build, because it proves the whole pipe end to end.

### Host chrome

- **Space → `next`.** The only binding that matters. Swallow it so it doesn't scroll the page.
- Refusal toasts, bottom corner, 3s — `wrong_phase` on a mistimed Space needs to be visible.
- A player's tile greys when `connected: false`, so you know it's their wifi and not your server.
- Hide the mouse cursor after 2s idle.
- Names, timer and scores should never be the smallest things on screen.
- A banner whenever a session is live, because you should not deploy mid-game and you will
  otherwise do it anyway.

---

## 5. Player view — wireframes

Portrait, ~390×844. Thumb-reachable. Tap targets **at least 60px tall**, full width where possible.

```css
/* the shell, every phase */
.phone {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;   /* identity | phase | reactions */
  padding-bottom: env(safe-area-inset-bottom);
  touch-action: manipulation;          /* kills the 300ms double-tap zoom delay */
}
button { user-select: none; min-height: 60px; }
```

`viewport-fit=cover` in the meta tag, or iPhone's home indicator fights the bottom row.

### Join — `/play`

```
┌───────────────────────┐
│   Q U I Z W I Z Z     │
│   joining game GH7K   │
│                       │
│   PICK YOUR FACE      │
│  ┌───┬───┬───┬───┬───┐│
│  │🐙 │🦊 │🐸 │🦉 │🐧 ││
│  ├───┼───┼───┼───┼───┤│
│  │🦁 │🐼 │🦄 │🐝 │🦋 ││
│  ├───┼───┼───┼───┼───┤│
│  │🐢 │🦈 │🐉 │👽 │🤖 ││
│  ├───┼───┼───┼───┼───┤│
│  │👻 │🧙 │🦖 │🍕 │🌮 ││
│  ├───┼───┼───┼───┼───┤│
│  │🍄 │🍩 │🥑 │🍒 │🌶️││
│  ├───┼───┼───┼───┼───┤│
│  │🧁 │🎸 │🚀 │⚡ │🎲 ││
│  ├───┼───┼───┼───┼───┤│
│  │🎺 │🏆 │💎 │🕹️│🌵 ││
│  ├───┼───┼───┼───┼───┤│
│  │🌊 │🌈 │🍀 │☄️ │🔮 ││
│  └───┴───┴───┴───┴───┘│
│                       │
│   NICKNAME            │
│  ┌───────────────────┐│
│  │ Ada          4/14 ││
│  └───────────────────┘│
│                       │
│  ┌───────────────────┐│
│  │     J O I N       ││
│  └───────────────────┘│
└───────────────────────┘
```

Cap the input at 14 characters client-side so `name_too_long` never happens. Disable Join until both
a face and a name are set. On `name_rejected`, say "pick a different name" without explaining.

If `GET /quizwizz/session` says `live: false`, show "No game running yet" and poll every 3s — people
scan the QR code before you press Start.

### LOBBY

```
┌───────────────────────┐
│  🦊 Ada          0 pts│
├───────────────────────┤
│                       │
│      YOU'RE IN        │
│                       │
│        ┌─────┐        │
│        │ 🦊  │        │
│        └─────┘        │
│         Ada           │
│                       │
│   Look at the big     │
│   screen. Waiting     │
│   for the host…       │
│                       │
│      7 players in     │
│                       │
├───────────────────────┤
│ 🔥 😂 💀 ❤️ 🤯 👏 😭 🎉│
└───────────────────────┘
```

### GAME — answering

The middle is the game's `<Player>`. Bare, large controls; the question is on the TV.

**No reaction bar.** The thumb zone belongs to the game.

```
┌───────────────────────┐
│  🦊 Ada          3 pts│
├───────────────────────┤
│ ███████████░░░░  0:08 │
│                       │
│  ┌─────────────────┐  │
│  │        A        │  │
│  └─────────────────┘  │
│  ┌─────────────────┐  │
│  │        B        │  │
│  └─────────────────┘  │
│  ┌─────────────────┐  │
│  │        C        │  │
│  └─────────────────┘  │
│  ┌─────────────────┐  │
│  │        D        │  │
│  └─────────────────┘  │
│                       │
│   ← no bar here; the  │
│   module owns to the  │
│   bottom edge         │
└───────────────────────┘
```

Lock the controls the instant an answer is sent — optimistically, before `answer:ack`. The server
rejects duplicates anyway, but a button that still looks live invites a second tap.

Split-screen by design: the question is on the TV, the phone is buttons. That falls out of
`toPlayer` never containing the question, so don't fight it.

### GAME — answered

```
┌───────────────────────┐
│  🦊 Ada          3 pts│
├───────────────────────┤
│ ███████░░░░░░░░  0:05 │
│                       │
│      LOCKED IN        │
│                       │
│        ┌─────┐        │
│        │  B  │        │
│        └─────┘        │
│                       │
│   Eyes on the screen  │
│                       │
│                       │
└───────────────────────┘
```

### RESULTS

The bar is back, and so are the standings. This is the phase people talk during — it is the one the
reaction bar exists for.

The phone shows the *whole* table rather than only their own line, because scrolling back to find
your own name at your own pace is the thing the television can't offer. Movement comes from `rank`
and `previousRank`; the list never auto-scrolls, since a thumb is already on it.

```
┌───────────────────────┐        ┌───────────────────────┐
│  🦊 Ada          6 pts│        │  🦊 Ada          6 pts│
├───────────────────────┤        ├───────────────────────┤
│  SCORES ARE IN        │        │  GAME OVER            │
│  Next up — Riddles    │        │  Thanks for playing!  │
│                       │        │                       │
│  1 🦊 Ada    ▲2    6  │        │  1 🦊 Ada          6  │
│  2 🚀 Cy     ▲1    5  │        │  2 🚀 Cy           5  │
│  3 🐙 Bo     ▼2    5  │        │  3 🐙 Bo           5  │
│  4 🐸 Dee          2  │        │  4 🐸 Dee          2  │
│                       │        │ ┌───────────────────┐ │
│                       │        │ │  Join a new game  │ │
│                       │        │ └───────────────────┘ │
├───────────────────────┤        ├───────────────────────┤
│ 🔥 😂 💀 ❤️ 🤯 👏 😭 🎉│        │ 🔥 😂 💀 ❤️ 🤯 👏 😭 🎉│
└───────────────────────┘        └───────────────────────┘
        RESULTS                           FINAL
```

### Terminal states

```
┌───────────────────────┐        ┌───────────────────────┐
│                       │        │                       │
│    RECONNECTING…      │        │      GAME OVER        │
│                       │        │                       │
│   ◠◡◠ your answers    │        │    You finished 3rd   │
│   are safe            │        │      6 points         │
│                       │        │                       │
└───────────────────────┘        └───────────────────────┘
```

"Your answers are safe" is true — a disconnect never removes you from the roster and never discards
a submitted answer. Say so; it stops people frantically reloading.

A kicked phone shows "You're out" and stops reconnecting.

### Reaction bar

Eight buttons from `EMOJI_PALETTE`, not a keyboard. Present in `LOBBY`, `RESULTS` and `FINAL` —
every phase the engine owns.

**Absent during `GAME`,** and that is the point. Eight people mashing 🔥 under a question they are
meant to be answering is a distraction the host cannot switch off, and the thumb zone is where a
module's controls go. Mount the bar from the intermission scene and nowhere else, so it has no
disabled state to get wrong: it is simply not in the tree at a moment it shouldn't be.

Rate limit is server-side: 5/sec sustained, burst of 10, excess dropped **silently**. Don't show an
error and don't disable the buttons — mashing is the point. Give each tap local feedback (a scale
pop) so it feels responsive whether or not that one made it through.

### Mobile details that bite on the night

- Request `navigator.wakeLock` and **re-request on `visibilitychange`**. Without it half the phones
  sleep between rounds and every round starts with people unlocking.
- No hover states — they stick on touch devices.
- `user-select: none` on buttons; long-press text selection during a fast round is maddening.
- Lock to portrait, or design both properly. Don't half-do it.
- Test on real phones on the actual venue wifi. Desktop responsive mode tells you nothing about any
  of this.

---

## 6. Build order

The milestone that matters is the loop, not the fun. A warmup round that never breaks is worth more
than four half-built formats.

**1 — the pipe.** This is the first test worth running, and it proves everything underneath. The
`engine/` folder it starts with is specified in
[FRONTEND-ARCHITECTURE.md §1](FRONTEND-ARCHITECTURE.md).
  1. `engine/socket.ts`, `identity.ts`, `api.ts`; the three doors wired up
  2. `/host` password gate → LOBBY with the code and QR
  3. `/play` avatar picker + nickname → join → "you're in"
  4. Tiles appear on the TV as phones join, grey out on disconnect
  5. Reaction bar on the phone → **emoji floating up the TV**

**2 — the shell.** Clock sync and the timer bar. All six phases rendering something on both views.
Space → `next`. Scoreboard with movement.

**3 — the first game.** Registry, one `Display` + `Player` pair, the full loop from title card to
scoreboard.

**4 — the rest.** The other formats are variations; minigames only add realtime input. Then polish:
transitions, sound, podium.

You cannot iterate on a 15-player game by opening 15 browser tabs — build the fake-player script
early (the server repo has a harness pattern for it) and use `jumpTo` so testing round seven doesn't
mean playing rounds one to six.
