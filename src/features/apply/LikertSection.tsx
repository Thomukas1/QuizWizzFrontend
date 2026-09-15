import { useEffect, useRef, useState } from 'react';
import { FormSection } from '../../primitives/form';

interface LikertSectionProps {
  statements: string[];
  // index -> chosen value (1–5). Missing = unanswered.
  answers: Record<number, number>;
  onAnswer: (index: number, value: number) => void;
  // Wipe every answer (used by "Start over").
  onReset: () => void;
  // Group-level error from the backend (scale_answers).
  error?: string;
}

const SCALE = [1, 2, 3, 4, 5];
// Accessible names for the colored circles (which carry no visible label).
const SCALE_LABELS = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];
// How long the chosen circle stays lit (and flashes) before auto-advancing, so
// the tap visibly registers.
const ADVANCE_DELAY_MS = 220;

const isAnswered = (value: number | undefined): value is number =>
  value !== undefined && value >= 1 && value <= 5;

// Rapid-fire Likert: one statement at a time, tap a 1–5 value and it
// auto-advances to the next — no going back. Answer fast, from the gut. A
// mistake is either accepted or wiped via "Start over", which resets to the
// first statement (fast to redo since it's rapid-fire).
export function LikertSection({ statements, answers, onAnswer, onReset, error }: LikertSectionProps) {
  // Resume where they left off — the section unmounts when the user steps away
  // and back, and restarting at statement 1 would read as lost progress.
  const [active, setActive] = useState(() => {
    const next = statements.findIndex((_, i) => !isAnswered(answers[i]));
    return next === -1 ? 0 : next;
  });
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
  }, []);

  const total = statements.length;
  const isLast = active === total - 1;
  const current = answers[active];
  const answeredCount = statements.reduce(
    (n, _, i) => (isAnswered(answers[i]) ? n + 1 : n),
    0,
  );
  const complete = total > 0 && answeredCount === total;

  const choose = (value: number) => {
    onAnswer(active, value);
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    if (!isLast) {
      advanceTimer.current = window.setTimeout(
        () => setActive(a => Math.min(total - 1, a + 1)),
        ADVANCE_DELAY_MS,
      );
    }
  };

  const startOver = () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    onReset();
    setActive(0);
  };

  return (
    <FormSection error={error}>
      {complete ? (
        <div className="likert__done">
          <p className="likert__done-text">You're all done!</p>
          <button type="button" className="likert__reset" onClick={startOver}>
            Start over
          </button>
        </div>
      ) : (
        <div className="likert">
          <p className="likert__statement">{statements[active]}</p>

          <div className="likert__anchors">
            <span>Disagree</span>
            <span>Agree</span>
          </div>
          <div className="likert__scale" role="radiogroup" aria-label="Agreement">
            {SCALE.map((n, i) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={current === n}
                aria-label={SCALE_LABELS[i]}
                className={`likert__opt likert__opt--${n}${current === n ? ' is-selected' : ''}`}
                onClick={() => choose(n)}
              />
            ))}
          </div>

          <div className="likert__progress">
            <div className="likert__bar">
              <div
                className="likert__bar-fill"
                style={{ width: `${total ? (answeredCount / total) * 100 : 0}%` }}
              />
            </div>
            <div className="likert__progress-row">
              <span className="likert__count">Statement {active + 1} of {total}</span>
              <button
                type="button"
                className="likert__reset"
                disabled={answeredCount === 0}
                onClick={startOver}
              >
                Start over
              </button>
            </div>
          </div>
        </div>
      )}
    </FormSection>
  );
}
