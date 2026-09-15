import type { FormConfig } from '../../services/slopbop';

// Field length caps, mirroring the backend's validation rules. The taste-answer
// bounds are not here — they come down in `config.answer_length`, so the server
// owns those numbers alone.
export const NAME_MAX = 32;
export const EMAIL_MAX = 100;

// Allowed-character / format rules, mirroring the backend. Name is a stage
// name, so spaces are allowed (the backend trims leading/trailing).
const NAME_RE = /^[a-zA-Z0-9 _-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Keyed by POST body field name, exactly as the backend's 400 body is, so a
// client-side error and a server one land on the same input.
export type FieldErrors = Record<string, string>;

export interface FormState {
  name: string;
  gender: 'male' | 'female' | null;
  zodiac: string | null;
  genres: string[];
  email: string;
  // statement index -> chosen 1–5. Missing = unanswered.
  scale: Record<number, number>;
  taste: string[];
}

export function validateIdentity(state: FormState, config: FormConfig): FieldErrors {
  const errors: FieldErrors = {};
  const name = state.name.trim();

  if (!name) errors.name = 'Name is required.';
  else if (name.length > NAME_MAX) errors.name = `Name must be ${NAME_MAX} characters or fewer.`;
  else if (!NAME_RE.test(name)) {
    errors.name = 'Name may only contain letters, numbers, spaces, underscores and hyphens.';
  }

  if (!state.gender) errors.gender = 'Gender must be one of: male, female.';

  if (!state.zodiac || !config.zodiac.includes(state.zodiac)) {
    errors.zodiac_sign = 'Zodiac sign must be one of the listed signs.';
  }

  const { max_select, options } = config.genres;
  if (state.genres.length < 1 || state.genres.length > max_select) {
    errors.genres = `Pick between 1 and ${max_select} genres.`;
  } else if (new Set(state.genres).size !== state.genres.length) {
    errors.genres = 'Genres must be distinct.';
  } else if (state.genres.some(g => !options.includes(g))) {
    errors.genres = 'Genres must be from the listed options.';
  }

  // Optional: blank is valid, malformed is not.
  const email = state.email.trim();
  if (email && (email.length > EMAIL_MAX || !EMAIL_RE.test(email))) {
    errors.email = 'Email must be a valid email address.';
  }

  return errors;
}

export function validateScale(state: FormState, config: FormConfig): FieldErrors {
  const answers = config.scale.map((_, i) => state.scale[i]);

  // The backend words this as a count mismatch, which only makes sense to
  // something assembling the payload by hand. Here it just means "keep going".
  if (answers.some(v => v === undefined)) {
    return { scale_answers: 'Test is not yet completed' };
  }
  if (answers.some(v => !Number.isInteger(v) || v < 1 || v > 5)) {
    return { scale_answers: 'Each scale answer must be an integer from 1 to 5.' };
  }
  return {};
}

// One answer is in range when its trimmed length sits inside config.answer_length
// — the same check the backend runs, and what turns a step dot green.
export function isAnswerComplete(answer: string, { min, max }: FormConfig['answer_length']) {
  const length = answer.trim().length;
  return length >= min && length <= max;
}

export function validateTaste(answers: string[], config: FormConfig): FieldErrors {
  const { taste_questions: questions, answer_length: bounds } = config;

  if (answers.length !== questions.length) {
    return { taste_answers: `Expected exactly ${questions.length} taste answers.` };
  }
  if (answers.some(a => !isAnswerComplete(a, bounds))) {
    return {
      taste_answers: `Each taste answer must be between ${bounds.min} and ${bounds.max} characters.`,
    };
  }
  return {};
}
