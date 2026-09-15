import React from 'react';

interface Props {
  question: string;
  answer: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}

export function FAQItem({ question, answer, open, onToggle }: Props) {
  return (
    // Styling lives in styles/components/faq.css — the type is animated and
    // stateful enough that it reads better there than as inline utilities.
    <div className="faq-item">
      <button type="button" onClick={onToggle} className="faq-question" aria-expanded={open}>
        <span>{question}</span>
        <span className="faq-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      <div className={`faq-answer ${open ? 'open' : ''}`}>
        <div>{answer}</div>
      </div>
    </div>
  );
}
