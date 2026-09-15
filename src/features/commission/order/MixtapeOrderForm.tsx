import { useState } from 'react';
import { useArtists } from '../../../hooks/artists';
import { isSigned } from '../../../services/slopbop';
import { ArtistCarousel } from './ArtistCarousel';
import { ContactForm } from './ContactForm';

/**
 * The ordering surface — everything after the pitch stops.
 *
 * It owns its own ground: the flat fill runs from the top of this section to
 * the bottom of the page, so crossing into it reads as "done reading, now
 * ordering". The fill has to live in here because the section is its containing
 * block, and that's the point — the mood change belongs to the act of ordering,
 * not to the page that happens to host it.
 *
 * Choosing an artist and making the ask are one act, so they're one component:
 * the carousel's selection feeds straight into what gets sent, with no page in
 * between holding the state.
 *
 * Today the ask is an email (ContactForm -> mailto:). When it becomes a real
 * ordering flow — Stripe, a booking calendar — only the piece below the
 * carousel changes; the framing, the selection and the fill stay, and
 * CommissionPage never learns about it.
 */
export function MixtapeOrderForm() {
  const { artists } = useArtists();
  // Only signed artists are rentable — a guest has nobody to book.
  const bookable = artists.filter(isSigned);
  // Index rather than an id: the first artist is featured by default, and the
  // list is only known once it loads.
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedArtist = bookable[selectedIndex];

  return (
    <section className="relative flex flex-col gap-lg px-md pt-3xl">
      <div className="section-fill section-fill-to-page-bottom bg-brand" aria-hidden="true" />

      <div className="flex flex-col gap-sm">
        <h2 className="font-display text-lg">Order now</h2>
        <p className="eyebrow">Pick an artist</p>
      </div>

      {/* Tap an artist's top song and the player keeps going while you write. */}
      <ArtistCarousel artists={bookable} index={selectedIndex} onIndexChange={setSelectedIndex} />

      <ContactForm selectedArtistName={selectedArtist?.name} />
    </section>
  );
}
