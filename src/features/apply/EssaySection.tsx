import { useState } from 'react';
import { FormSection, StepNav, TextAreaField } from '../../primitives/form';
import { isAnswerComplete } from './validation';
import type { FormConfig } from '../../services/slopbop';

interface EssaySectionProps {
  questions: string[];
  answers: string[];
  onAnswerChange: (index: number, value: string) => void;
  // Length bounds from the config — the max caps typing, the min gates the step
  // dot and drives the counter's warning state.
  bounds: FormConfig['answer_length'];
  // Group-level error (taste_answers).
  error?: string;
  // Accessible name for the step buttons, e.g. "Taste questions".
  ariaLabel: string;
}

// The open-answer section as a stepped questionnaire: numbered buttons switch
// between questions, one is shown at a time, and each turns green once answered
// within bounds. The counter is the only place the minimum is visible, so it
// stays on screen while typing rather than waiting for a submit.
export function EssaySection({
  questions,
  answers,
  onAnswerChange,
  bounds,
  error,
  ariaLabel,
}: EssaySectionProps) {
  const [active, setActive] = useState(0);
  const complete = questions.map((_, i) => isAnswerComplete(answers[i] ?? '', bounds));

  const length = (answers[active] ?? '').trim().length;
  const short = length < bounds.min;

  return (
    <FormSection error={error}>
      <TextAreaField
        label={questions[active]}
        largeLabel
        required
        value={answers[active] ?? ''}
        onChange={value => onAnswerChange(active, value)}
        maxLength={bounds.max}
        rows={6}
      />
      <p className={`text-xs text-right ${short ? 'text-danger' : 'text-muted'}`}>
        {short ? `${bounds.min - length} more characters needed` : `${length}/${bounds.max}`}
      </p>
      <div className="flex justify-center">
        <StepNav
          count={questions.length}
          active={active}
          complete={complete}
          onSelect={setActive}
          ariaLabel={ariaLabel}
        />
      </div>
    </FormSection>
  );
}
