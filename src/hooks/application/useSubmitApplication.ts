import { useState, useCallback } from 'react';
import {
  submitApplication,
  ApplicationPayload,
  ApplicationResult,
  SubmitOutcome,
} from '../../services/slopbop';

// Command-shaped mutation hook: POST the application and surface the result.
// `fieldErrors` maps payload field names → messages from a 400; map them onto
// inputs. A 500 / network error rejects — callers should show a generic retry.
export function useSubmitApplication() {
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ApplicationResult | null>(null);

  const submit = useCallback(
    async (payload: ApplicationPayload): Promise<SubmitOutcome> => {
      setSubmitting(true);
      setFieldErrors({});
      try {
        const outcome = await submitApplication(payload);
        if (outcome.ok) setResult(outcome.data);
        else setFieldErrors(outcome.errors);
        return outcome;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return { submit, submitting, fieldErrors, result };
}
