import React, { useState } from 'react';
import { FAQItem } from './FAQItem';

export interface FAQEntry {
  question: string;
  answer: React.ReactNode;
}

interface Props {
  items: FAQEntry[];
  title?: string;
}

// Accordion list — one open at a time. The questions themselves are the
// consumer's: each page brings its own data, since the voice differs per page.
export function FAQ({ items, title }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="px-md">
      {/* The title is the card's own filled bar, not a heading above it — see
          styles/components/faq.css. */}
      <div className="faq-card">
        {title && <h2 className="faq-title">{title}</h2>}
        <div className="faq-list">
          {items.map((item, i) => (
            <FAQItem
              key={i}
              question={item.question}
              answer={item.answer}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
