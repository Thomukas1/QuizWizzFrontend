import { useCallback, useState } from 'react';
import { QuizWizzError, join } from '../../services/quizwizz';
import type { Avatar, PlayerJoinResponse, QuizWizzReason } from '../../services/quizwizz';

/**
 * The phone's door. Name and avatar in, identity stored, ready to open a socket.
 *
 * The failure is returned as a `reason` as well as a message, because the form
 * needs to know *which control* to point at — the nickname field and the avatar
 * grid both fail as a 400 and only the reason tells them apart.
 */

/** Which control a refusal belongs to. `null` means it belongs to the page. */
export type JoinField = 'name' | 'avatar' | null;

const FAILURES: Partial<Record<QuizWizzReason, { field: JoinField; message: string }>> = {
  name_required: { field: 'name', message: 'Pick a nickname.' },
  // The input should be capped at NAME_MAX_LENGTH, so this arriving means the cap
  // is missing somewhere — but a room full of phones is the wrong place to find out.
  name_too_long: { field: 'name', message: 'That name is too long.' },
  // Deliberately vague. Explaining the filter turns it into a puzzle, and the
  // name is going on a television.
  name_rejected: { field: 'name', message: 'Pick a different name.' },
  avatar_required: { field: 'avatar', message: 'Pick a face.' },
  // Our picker sent something off-list: a bug on this side, not a user error.
  avatar_rejected: { field: 'avatar', message: 'That one didn’t work — pick another.' },
  session_full: { field: null, message: 'The room is full.' },
  no_live_session: { field: null, message: 'No game is running right now.' },
  not_configured: { field: null, message: "QuizWizz isn't set up on the server yet." },
};

export function useJoin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<JoinField>(null);

  const submit = useCallback(
    async (name: string, avatar: Avatar): Promise<PlayerJoinResponse | null> => {
      setLoading(true);
      setError(null);
      setField(null);
      try {
        return await join(name, avatar);
      } catch (err) {
        const reason = err instanceof QuizWizzError ? err.reason : null;
        const failure = reason ? FAILURES[reason] : undefined;
        setError(failure?.message ?? "Couldn't reach the server.");
        setField(failure?.field ?? null);
        if (reason === 'avatar_rejected') {
          console.error('[quizwizz] the avatar picker sent something off-list');
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { join: submit, loading, error, field };
}
