import { useCallback, useState } from 'react';
import { QuizWizzError, hostLogin } from '../../services/quizwizz';
import type { HostLoginResponse, QuizWizzReason } from '../../services/quizwizz';

/**
 * The host's door. Password in, token stored, session resumed if one was already
 * running — so a reloaded host tab lands back in the live game rather than
 * opening a second one over the top of it.
 */

const MESSAGES: Partial<Record<QuizWizzReason, string>> = {
  bad_password: 'Wrong password.',
  // Not the operator's fault and not fixable from this form: the server has no
  // host password configured. Say so plainly rather than implying a typo.
  not_configured: "QuizWizz isn't set up on the server yet.",
};

export function useHostLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (password: string): Promise<HostLoginResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      return await hostLogin(password);
    } catch (err) {
      const reason = err instanceof QuizWizzError ? err.reason : null;
      setError((reason && MESSAGES[reason]) ?? "Couldn't reach the server.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { login, loading, error };
}
