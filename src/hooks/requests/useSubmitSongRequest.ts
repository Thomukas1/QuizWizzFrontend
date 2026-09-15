import { useState, useCallback } from 'react';
import {
  submitSongRequest,
  submitSignedSongRequest,
  RequestStatus,
  SongRequestPayload,
  SongRequestResult,
  SongRequestOutcome,
} from '../../services/slopbop';
import { useAuth } from '../../context/AuthContext';

// Command-shaped mutation hook: POST a song request and surface the result.
// `fieldErrors` maps payload field names → messages from a 400; map them onto
// inputs. A 404 / 500 / network error rejects — callers should show a generic
// retry.
//
// Which of the two doors it posts through is decided here, from the collection's
// declared `submitters` and the session — never by the caller, so the form and
// the request can't disagree about who's submitting:
//
//   submitters: 'owner'   always signed. The anonymous door can't prove the
//                         artist is the artist, so it 403s even for them.
//   submitters: 'anyone'  signed if there's a session, anonymous otherwise. The
//                         typed name is dropped when signed in — the account is
//                         the credit.
//
// That one line is the whole reason an album needs no submit hook of its own: an
// album is a collection whose door admits one person, which is a value, not a
// separate code path.
//
// `forbidden` is still a real outcome and callers should handle it. `submitters`
// gates the *form* on ownership the viewer claims; this is the server's answer
// about the wallet, arriving late — a signed-in fan who reaches an album's door
// lands here.
export function useSubmitSongRequest(status: RequestStatus) {
  const { isAuthed } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SongRequestResult | null>(null);

  const signed = status.submitters === 'owner' || isAuthed;

  const submit = useCallback(
    async (collectionId: string, payload: SongRequestPayload): Promise<SongRequestOutcome> => {
      setSubmitting(true);
      setFieldErrors({});
      try {
        const outcome = signed
          ? await submitSignedSongRequest(collectionId, { text: payload.text })
          : await submitSongRequest(collectionId, payload);
        if (outcome.ok) setResult(outcome.data);
        else if (outcome.kind === 'validation') setFieldErrors(outcome.errors);
        return outcome;
      } finally {
        setSubmitting(false);
      }
    },
    [signed],
  );

  return { submit, submitting, fieldErrors, result };
}
