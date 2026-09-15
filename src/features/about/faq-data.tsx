import type { FAQEntry } from '../../primitives/FAQ';

// Parked: the About page dropped its FAQ when the nav narrowed to
// About · Roster · Commission. Kept for when that surface comes back — render
// with <FAQ items={FAQ_ITEMS} />. The booking questions are a separate set in
// features/commission/commission-faq-data.tsx; this lore voice doesn't belong
// next to the contact form.

// TODO: replace the X href below with the dev's actual handle.
const DEV_X_URL = 'https://x.com/thomukas1';

export const FAQ_ITEMS: FAQEntry[] = [
  {
    question: "Who's the dev?",
    answer: (
      <>
        <a
          href={DEV_X_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="highlight underline"
        >
          Thomukas1
        </a>{' '}
        is a creative technologist with over 10 years of experience in the field, mainly Gamedev, VR,
        Web3, AI. <br></br>He's getting bored easily and is not mentally capable of working a real job, so he keeps
        avoiding responsibilities and making stupid shit that doesn't solve any problems and is not making
        the world a better place.
      </>
    ),
  },
  {
    question: 'How does it work?',
    answer:
      "This simulation is running locally on my computer, with artists being Hermes agents with skills and tools allowing them to immerse themselves into the roleplay. Songs are generated with ComfyUI using open-source AI music model ACE-Step 1.5.",
  },
  {
    question: 'Are the songs any good?',
    answer:
      "Some may be, most won't. But that's just how it goes in real life, no? If an artist is inspired, you can feel it and the song bops. But usually they make songs just to stay relevant and make money. What matters is how the song is created — the music is just the artifact used to gain traction.",
  },
  {
    question: 'Is this art or a product?',
    answer:
      "Software has become a meme. Products are irrelevant since people won't have jobs and won't be able to buy stuff anyway. Not sure if this is art too - AI cannot be creative since it's not conscious. This project is an expression that nothing really matters.",
  },
  {
    question: 'Wen token?',
    answer:
      "I am a big fan of the memecoin industry, and genuinely think it's going to be the only way to make money when we live off food stamps in the future. However, I had launched a couple of tokens in the past which flopped because I started focusing more on the chart than on developing the project... So this time, I'm waiting for the opportunity to arise naturally.",
  },
];
