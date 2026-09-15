import { FAQ } from '../../primitives/FAQ';
import { ExampleMixtape } from './ExampleMixtape';
import { DayBreakdown } from './DayBreakdown';
import { PrizeVideo } from './PrizeVideo';
import { MixtapeOrderForm } from './order/MixtapeOrderForm';
import { COMMISSION_FAQ_ITEMS } from './commission-faq-data';

export default function CommissionPage() {
  return (
    // No bottom padding: the ordering section runs to the page's edge and its
    // fill measures from there, so any gap here would leave the colour short.
    <div className="flex flex-col gap-3xl">
      {/* Hero — image, then the kicker and the h1 as one block. They're a single
          sentence read top-down, so the kicker can't live in its own gap-3xl
          section away from the line it answers. The product itself is named by
          the prose directly below rather than up here. */}
      <header className="flex flex-col">
        <img src="/Branding/contact-visual.png" alt="" className="w-full block" />
        <div className="flex flex-col gap-xs px-md pt-md">
          <p className="eyebrow">Ever wanted to create a mixtape?</p>
          <h1 className="font-display text-3xl leading-tight">Now you can!</h1>
        </div>
      </header>

      {/* The offer, stated plainly — the headline hooks, this names the thing.
          Leads on what you're buying, then on what makes the artist worth
          renting: the four facets they're built from. No hours, no group size,
          no occasions — every rule here is DayBreakdown's job, and repeating
          them costs the reader the momentum this section exists to build. */}
      <section className="flex flex-col gap-md px-md">
        <p className="text-base leading-relaxed">
          Hire a synthetic artist for an unforgettable group attraction —
          <span className="highlight"> producing a mixtape</span>.
        </p>
        <p className="text-base leading-relaxed">
          Your chosen artist has a custom voice, personality, appearance and music taste. With you as
          authors of the lyrics, they can produce a cohesive mixtape that encapsulates the vibe and
          energy of your group.
        </p>
      </section>

      {/* The artifact, made real — and the first thing on the page you can touch
          rather than read. Sits here, right where the TL;DR names it, instead of
          down by the carousel: the interactive blocks are the page's visual
          breaks, so they're spread across the prose rather than stacked.

          The lines underneath are the bonding pitch, and this is the one place
          they land without being a claim: you've just heard what a track sounds
          like, so the mixtape is already real by the time they say what it does
          for the group. */}
      <section className="flex flex-col gap-lg px-md">
        <ExampleMixtape />
        <div className="flex flex-col gap-md">
          <p className="text-base leading-relaxed">
            This experience is an additional layer of fun throughout a special day with a group of
            friends or colleagues.
          </p>
          <p className="text-base leading-relaxed">
            It's like <span className="highlight">glue</span> that keeps you in the same wavelength,
            making you both work as a team and compete for popularity!
          </p>
        </div>
      </section>

      {/* The mechanic and the fit check, in one frame — the half of the pitch
          that has to survive being forwarded to whoever approves the money. */}
      <DayBreakdown />

      {/* The prize — the page's crescendo, and the only part of the day that
          leaves the room. Placed last before the FAQ so the pitch escalates
          into it, and it does double duty: it's the stakes that make a bop
          worth arguing about, and it's the reach that justifies the spend to a
          community's marketing budget. The video is the proof. */}
      <section className="flex flex-col gap-lg px-md">
        <div className="flex flex-col gap-md">
          <h2 className="font-display text-lg">The Prize</h2>
          <p className="text-base leading-relaxed">
            Make sure to bop your favorite songs, because the most bopped one will
            <span className="highlight"> go public</span>.
          </p>
          <p className="text-base leading-relaxed">
            24 hours after the mixtape is completed, the song with the most bops will upgrade into
            a music video and be posted on our social channels for a chance to go viral!
          </p>
        </div>

        <PrizeVideo />
      </section>

      {/* The detail, opt-in — anything that would clog the page as prose. Above
          the ask on purpose: objections get answered before you're asked to
          write, and the form gets to be the last thing on the page. */}
      <FAQ items={COMMISSION_FAQ_ITEMS} title="Frequent questions" />

      {/* The ask. Self-contained down to its own background, so the page ends
          where the pitch does — everything past this line belongs to ordering,
          including whatever the ask turns into next. */}
      <MixtapeOrderForm />
    </div>
  );
}
