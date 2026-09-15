import { useEffect, useState } from 'react';
import { IdentityStep } from './IdentityStep';
import { EssaySection } from './EssaySection';
import { LikertSection } from './LikertSection';
import {
  validateTaste,
  validateIdentity,
  validateScale,
  type FieldErrors,
  type FormState,
} from './validation';
import { useFormConfig, useSubmitApplication } from '../../hooks/application';
import { useToast } from '../../context/ToastContext';
import { type ApplicationPayload } from '../../services/slopbop';

// The step name in the progress line is the only heading a step gets — the
// cards hold nothing but their fields.
const STEPS = ['Identity', 'Archetype Test', 'Taste'] as const;

// Which step owns each payload field, so a 400 can drop the user on the step
// that needs fixing. Keys match the backend's error keys exactly.
const FIELD_STEP: Record<string, number> = {
  name: 0,
  gender: 0,
  zodiac_sign: 0,
  genres: 0,
  email: 0,
  scale_answers: 1,
  taste_answers: 2,
};

// `taste` starts empty and is indexed against the config's question list, so the
// number of questions is the server's to change.
const EMPTY_STATE: FormState = {
  name: '',
  gender: null,
  zodiac: null,
  genres: [],
  email: '',
  scale: {},
  taste: [],
};

export default function ApplicationForm() {
  const { config, loading, error } = useFormConfig();
  const { submit, submitting, fieldErrors, result } = useSubmitApplication();
  const { showToast } = useToast();

  const [state, setState] = useState<FormState>(EMPTY_STATE);
  const [step, setStep] = useState(0);
  // Steps whose Next (or Apply) has been pressed — errors stay hidden until
  // then, so a step doesn't open covered in red.
  const [attempted, setAttempted] = useState<boolean[]>(() => STEPS.map(() => false));
  // A server error describes the payload that was sent; the moment anything is
  // edited it's stale and stops being shown. The client mirror covers the same
  // rules in the meantime.
  const [serverErrorsStale, setServerErrorsStale] = useState(false);

  const edit = (updater: (prev: FormState) => FormState) => {
    setState(updater);
    setServerErrorsStale(true);
  };

  const patch = (fields: Partial<FormState>) => edit(prev => ({ ...prev, ...fields }));

  const setScaleAnswer = (index: number, value: number) =>
    edit(prev => ({ ...prev, scale: { ...prev.scale, [index]: value } }));
  const resetScale = () => patch({ scale: {} });

  const setTasteAnswer = (index: number, value: string) =>
    edit(prev => {
      const taste = [...prev.taste];
      taste[index] = value;
      return { ...prev, taste };
    });

  // Client-side mirror of the backend's rules, per step. Server errors are
  // layered on top — they're the authoritative answer for the same keys.
  // Answers are read through the config's question list so the count is always
  // the server's, whatever `state.taste` happens to hold.
  const tasteAnswers = config ? config.taste_questions.map((_, i) => state.taste[i] ?? '') : [];

  const stepErrors: FieldErrors[] = config
    ? [
        validateIdentity(state, config),
        validateScale(state, config),
        validateTaste(tasteAnswers, config),
      ]
    : STEPS.map(() => ({}));

  const shown = (index: number): FieldErrors => ({
    ...(attempted[index] ? stepErrors[index] : {}),
    ...(serverErrorsStale ? {} : fieldErrors),
  });

  // A 400 means the client checks and the server disagreed; go to where the
  // disagreement is rather than leaving the user on the last step.
  useEffect(() => {
    setServerErrorsStale(false);
    const keys = Object.keys(fieldErrors);
    if (keys.length === 0) return;
    const target = Math.min(...keys.map(key => FIELD_STEP[key] ?? STEPS.length - 1));
    setAttempted(prev => prev.map((was, i) => was || i === target));
    setStep(target);
  }, [fieldErrors]);

  const markAttempted = (index: number) =>
    setAttempted(prev => prev.map((was, i) => (i === index ? true : was)));

  function next() {
    markAttempted(step);
    if (Object.keys(stepErrors[step]).length > 0) return;
    setStep(s => Math.min(STEPS.length - 1, s + 1));
  }

  async function handleApply() {
    setAttempted(STEPS.map(() => true));
    if (!config) return;

    // Land on the step that needs fixing rather than failing silently on the
    // last one. The gender/zodiac guard after it is type narrowing — those two
    // are already covered by the Identity step's errors.
    const firstInvalid = stepErrors.findIndex(errors => Object.keys(errors).length > 0);
    if (firstInvalid !== -1) {
      setStep(firstInvalid);
      return;
    }
    if (!state.gender || !state.zodiac) return;

    const payload: ApplicationPayload = {
      name: state.name.trim(),
      gender: state.gender,
      // Every answer array is built by mapping the config, so position is the
      // config's order — never state's iteration order.
      scale_answers: config.scale.map((_, i) => state.scale[i]),
      taste_answers: tasteAnswers.map(a => a.trim()),
      zodiac_sign: state.zodiac,
      genres: state.genres,
      email: state.email.trim() || null,
    };

    try {
      const outcome = await submit(payload);
      // On success the hook's `result` flips us to the thank-you screen below.
      if (!outcome.ok) {
        showToast('Please fix the highlighted fields and try again.', 'warning');
      }
    } catch {
      showToast('Something went wrong. Please try again.');
    }
  }

  if (result) {
    return (
      <div className="flex flex-col items-center gap-lg py-4xl px-md text-center">
        <img src="/Branding/cds_thankyou.png" alt="Thank you" className="w-full" />
        <p className="text-base leading-relaxed">
          Thanks for taking the time to apply.
          <br />
          Hope to see you come to life as an artist in the SlopBop show!
        </p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-center py-4xl">Loading form…</p>;
  }
  if (error || !config) {
    return <p className="text-center text-danger py-4xl">{error ?? 'Failed to load form'}</p>;
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div className="flex flex-col gap-xl py-lg px-md">
      <header className="flex flex-col gap-sm">
        <h1 className="font-display text-xl">Become an Artist</h1>
        <p className="text-sm leading-relaxed">
          Fill out the application form below for a chance to become a signed synthetic artist at the Slopbop Music Label!
        </p>
      </header>

      <div className="flex flex-col gap-sm">
        <div className="flex gap-xs" aria-hidden="true">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`h-1 flex-1 rounded-sm ${i <= step ? 'bg-accent' : 'bg-border'}`}
            />
          ))}
        </div>
        <p className="text-sm">
          Step {step + 1} of {STEPS.length} - {STEPS[step]}
        </p>
      </div>

      <div className="form">
        {step === 0 && (
          <IdentityStep config={config} state={state} patch={patch} errors={shown(0)} />
        )}

        {step === 1 && (
          <LikertSection
            statements={config.scale}
            answers={state.scale}
            onAnswer={setScaleAnswer}
            onReset={resetScale}
            error={shown(1).scale_answers}
          />
        )}

        {step === 2 && (
          <EssaySection
            questions={config.taste_questions}
            answers={tasteAnswers}
            onAnswerChange={setTasteAnswer}
            bounds={config.answer_length}
            error={shown(2).taste_answers}
            ariaLabel="Taste questions"
          />
        )}

        <div className="flex gap-md">
          {step > 0 && (
            <button
              type="button"
              className="back shrink-0"
              onClick={() => setStep(s => Math.max(0, s - 1))}
            >
              Back
            </button>
          )}
          {isLast ? (
            <button
              type="button"
              className="special flex-1"
              disabled={submitting}
              onClick={handleApply}
            >
              {submitting ? 'Applying…' : 'Apply'}
            </button>
          ) : (
            <button type="button" className="special flex-1" onClick={next}>
              Next
            </button>
          )}
        </div>
      </div>

      <footer className="mt-2xl pt-2xl border-t border-divider text-center text-sm leading-relaxed">
        Got an AI assistant? They can fill it up for you!
        <br />
        Tell them to read this page:{' '}
        <a
          href="https://www.slopbop.com/form/SKILL.md"
          className="text-accent underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          slopbop.com/form/SKILL.md
        </a>
      </footer>
    </div>
  );
}
