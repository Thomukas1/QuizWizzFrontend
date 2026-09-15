import type { FAQEntry } from '../../primitives/FAQ';

// Four, deliberately. Everything a buyer needs to *get it* is on the page as
// prose; this is only what they'd still stall on before booking — the fear
// first, then the practical stuff: the setup, the clock, and who ends up
// hearing it. Anything the page already answers (the artist, the prize, group
// size, what you walk away with) is not repeated here. Cost stays off the page:
// inbound only, no price list, handled over email.
//
// Nothing here describes a host running the day in person. The product is meant
// to stand on its own, so the answers describe the app doing the work.
export const COMMISSION_FAQ_ITEMS: FAQEntry[] = [
  {
    // Leads on purpose. The rest of the list is logistics, which only matter to
    // someone already sold — this is the one that decides whether they get
    // there. "I'm not creative" is the reflex that kills the whole thing, and
    // it needs answering before the page asks anyone to write.
    question: "But I'm not a songwriter...",
    answer:
      "You don't have to be! Write whatever nonsense you can come up with. It doesn't matter if it rhymes, or whether every word is just 'meow meow'.... the most fun songs are the most unexpected ones.",
  },
  {
    question: 'Is this online or IRL?',
    answer:
      "Both work. Either way, everyone needs a phone with an internet connection and its sound working - that's what you submit your song on, and what the songs play out of when they drop!",
  },
  {
    // The honest version of "how long" — a range would be a guess, because the
    // length is something the group actually sets. The worked example is the
    // answer; the hour is the only fixed part.
    question: 'How long does it last?',
    answer:
      'One hour for the submission window, then it depends on how far apart you space the releases. Ten people releasing 30 minutes apart puts the finished mixtape about six hours out. It runs in the background either way... nobody has to sit and watch it happen.',
  },
  {
    question: 'Who can listen to our mixtape?',
    answer:
      'Every mixtape is currently public. That cuts both ways in your favour: family and friends who are not in the room can listen along and bop as the songs drop, and Slop Bop listeners can find you.',
  },
];
