# Theme & Voice

A quick orientation to how SlopBop looks, and why. `theme.css` is the source of
truth; this is the intent behind it.

## The feeling

Underground, crypto-native, a little edgy. A dark room with one bright light.
Colour is rationed on purpose — against the navy, a little goes a long way, so
every colour that appears is doing a job, not decorating.

## Colour, and what it means

Swap the ten palette values in `theme.css` and the whole app reskins. Everything
below points at those through semantic roles — reach for the role, never a raw hex.

- **Navy & Cobalt** — the room. Navy is the background (a slow diagonal two-tone);
  cobalt is every raised surface: cards, panels, chips.
- **Lime** (`accent`) — the spotlight. The colour that says *look here*: section
  kickers, the now-playing track, the BOP button. Keep it scarce enough that it
  always means something.
- **Lime-2** (`accent-dim`) — lime's quieter cousin, for emphasis *inside* a
  sentence. A highlighted word or two, never a whole line.
- **Sage** (`soft`) — the human hand. Reserved for what a real person actually
  made: lyrics, author credits. The one warm note in a cool palette — that warmth
  is the point, so don't spend it elsewhere.
- **Steel** (`muted`) — the whisper. Secondary text, captions, and *off* states
  (an inactive tab, a disabled button).
- **Coral & Amber** — meaning, not decoration. Coral is error; amber is a
  warning. If it isn't one of those, it isn't this colour.
- **Facet colours** (`--facet-*`) — the four elements an artist is built from
  (personality, appearance, voice, taste). A pop of range, kept to the Roster.

Two greys draw lines: **border** for structural edges (card and nav outlines),
**divider** for hairline separators between rows. Same family, different weight.

## Type

Two faces: **Xirod** (display) for headings and artist names; **Masicu** (body)
for everything else. Text lives on a busy background, so it carries a *soft*
shadow for legibility — a whisper of depth, never a sticker outline.

A small set of named roles carry meaning — prefer them over ad-hoc styling:

- **Eyebrow** — the little uppercase lime kicker that announces a section or card.
  It breathes (a weak glow): the app's one bit of ambient motion.
- **Subtle** — prose that should step back: subtitles, captions, asides. Reach for
  this when text is simply *quiet*; use raw `muted` only when the colour is driven
  by state.
- **Highlight** — one or two accented words in a line. No more.

## Principles

- **Tailwind first.** Style inline; drop to a `styles/components/*.css` file only
  for motion, complex states, or something with real reusable identity.
- **Tokens are the truth.** No hard-coded hex in a component. Reskinning should
  stay a palette swap, and nothing else.
- **Motion is a garnish.** One gentle pulse, `prefers-reduced-motion` honoured.
  Restraint is the aesthetic.
