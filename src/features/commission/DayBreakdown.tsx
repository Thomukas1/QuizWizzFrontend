// The days this bolts onto. Four, in a 2x2 — enough to cover the spread from a
// company budget to a group of friends, few enough to read at a glance. They're
// examples, not a menu: the point is "a day that's already happening".
const OCCASIONS: { emoji: string; label: string }[] = [
  { emoji: '🏢', label: 'Team offsite' },
  { emoji: '💻', label: 'Hackathon' },
  { emoji: '🎂', label: 'Party' },
  { emoji: '🏕️', label: 'Camping' },
  { emoji: '📸', label: 'Day Trip' },
];

// How a day runs, as three plain beats — the mechanic without the clutter.
const FLOW: { title: string; body: string }[] = [
  {
    title: 'Create',
    body: 'During submission window, everyone submits hand-written lyrics for the artist to turn into a 40-second song',
  },
  {
    title: 'Release',
    body: 'The songs release over the day on a schedule with a live countdown, building anticipation among the participants',
  },
  {
    title: 'Bop',
    body: 'When a song drops, listen to it and bop the ones you like — the most bopped song is the best banger of the day!',
  },
];

/**
 * The whole shape of a day in one card: how many of you, how it runs, and which
 * days it bolts onto.
 *
 * This is the page's defensible half — the part that gets screenshotted and
 * forwarded to whoever approves the money, which is why it's one frame rather
 * than three sections. It reads as a spec sheet on purpose: the pitch around it
 * does the wanting, this answers "is this us, and what actually happens".
 *
 * Size leads because it's the fastest self-check on the page, and the card
 * closes on the occasions for the same reason — a reader who doesn't fit either
 * end never has to read the middle.
 */
export function DayBreakdown() {
  return (
    <section className="flex flex-col gap-lg px-md">
      <h2 className="font-display text-lg">How it works</h2>
      <div className="frosted-card !p-lg flex flex-col">
        {/* Who it's for, before how it runs — the GPU throughput ceiling
            (~6–20 songs/day) framed as what it buys them: intimacy. */}
        <div className="flex flex-col gap-xs">
          <p className="eyebrow">Recommended group size</p>
          <p className="font-display text-2xl">🧑 8–16</p>
        </div>

        <div className="frosted-card-divider-h !my-lg" />

        <div className="flex flex-col gap-lg">
          {FLOW.map(({ title, body }, i) => (
            <div key={title} className="flex gap-md items-start">
              <span className="font-display text-base text-alt bg-accent rounded-full w-8 h-8 shrink-0 flex items-center justify-center">
                {i + 1}
              </span>
              <div className="flex flex-col gap-xs pt-1">
                <h3 className="font-display text-base leading-tight">{title}</h3>
                <p className="text-sm subtle leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="frosted-card-divider-h !my-lg" />

        {/* Closes the card on the fit check: a reader spots their own day and
            places the whole thing without reading a definition. */}
        <div className="flex flex-col gap-sm">
          <p className="eyebrow">Compatible with</p>
          {/* Chips hug their label and wrap, rather than stretching to a grid
              cell — these are examples, so an uneven run of them reads as "and
              days like these" where four equal boxes read as a menu of four.
              Cobalt fill (the palette's surface tone) is what separates them
              from the frosted card they sit on; the old white/10 was the same
              value as the card itself. */}
          <div className="flex flex-wrap gap-sm">
            {OCCASIONS.map(({ emoji, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-sm rounded-md bg-surface border-xs border-brand px-md py-sm text-sm leading-none"
              >
                <span aria-hidden="true">{emoji}</span>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
