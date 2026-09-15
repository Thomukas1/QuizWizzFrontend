import { useEffect, useState } from 'react';

interface Testimonial {
  quote: string;
  author: string; // a nickname — real name, first name, or handle, whatever they're happy with
}

/**
 * Real quotes from people whose group commissioned a mixtape. Add entries here as
 * they come in; the card hides itself entirely while the list is empty, so
 * there is never any placeholder/fake social proof on the page.
 */
const TESTIMONIALS: Testimonial[] = [
  { quote: 'Wow this shit is so fun.', author: 'Thomukas1' },
  { quote: 'Your AI gems entertain me', author: 'Gintaras' },
];

const ROTATE_MS = 6000; // how long each quote is shown — the single timing source
const SLIDE_MS = 500; // slide-out/slide-in duration
const EQ_BARS = 24; // ambient equalizer bars behind the quote

export function Testimonials() {
  const count = TESTIMONIALS.length;
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(true);

  // Advancing is driven by the countdown bar's `animationend` (see below), so
  // the slide switches exactly when the bar empties — one clock, no drift.
  const advance = () => setIndex(i => i + 1);

  // Re-enable the transition on the frame after a snap-back (see below).
  useEffect(() => {
    if (animating) return;
    const raf = requestAnimationFrame(() => setAnimating(true));
    return () => cancelAnimationFrame(raf);
  }, [animating]);

  if (count === 0) return null;

  // A clone of the first slide is appended so the track can keep sliding left
  // past the last real slide; once it lands on the clone we snap back to 0 with
  // no transition, making the loop look continuous (always leaving left).
  const slides = count > 1 ? [...TESTIMONIALS, TESTIMONIALS[0]] : TESTIMONIALS;
  const activeDot = index % count;

  const handleTransitionEnd = () => {
    if (index === count) {
      setAnimating(false);
      setIndex(0);
    }
  };

  return (
    <div className="mx-md bg-surface border border-border rounded-lg p-lg flex flex-col gap-md overflow-hidden">
      {/* Header: label on the left, position dots on the right */}
      <div className="flex items-center justify-between">
        <span className="eyebrow">Testimonials</span>
        {count > 1 && (
          <div className="flex gap-sm" aria-hidden="true">
            {TESTIMONIALS.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full transition-base ${
                  i === activeDot ? 'bg-accent' : 'bg-white/25'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sliding track inside an inner card */}
      <div className="relative bg-surface-2 border border-border rounded-lg p-lg overflow-hidden">
        {/* Ambient equalizer behind the quote */}
        <div className="testimonial-eq" aria-hidden="true">
          {Array.from({ length: EQ_BARS }).map((_, i) => (
            <span key={i} style={{ animationDelay: `${(i % 7) * 0.22}s` }} />
          ))}
        </div>

        {/* Viewport clips the track exactly at the slide edges. The card padding
            lives on the parent, outside this, so a neighbouring slide can't peek
            into the padding strip as it scrolls past. */}
        <div className="relative overflow-hidden">
          <div
            className="flex"
            style={{
              transform: `translateX(-${index * 100}%)`,
              transition: animating ? `transform ${SLIDE_MS}ms ease` : 'none',
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {slides.map((t, i) => (
              <figure key={i} className="w-full shrink-0 flex flex-col justify-center gap-md">
                <blockquote className="text-base leading-relaxed text-center">“{t.quote}”</blockquote>
                <figcaption className="text-sm highlight text-center">— {t.author}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>

      {/* Countdown to the next slide. Keyed on activeDot so it restarts on each
          visible change but not on the (invisible) loop snap-back. */}
      {count > 1 && (
        <div className="h-1 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
          <div
            key={activeDot}
            className="testimonial-progress h-full bg-accent"
            style={{ animationDuration: `${ROTATE_MS}ms` }}
            onAnimationEnd={advance}
          />
        </div>
      )}
    </div>
  );
}
