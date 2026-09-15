import type { QuizWizzReason } from './protocol';

/**
 * Where the server is. `VITE_WS_URL` is derived from the API base when it isn't
 * set, because the two are the same host in every deployment we have — but it
 * stays overridable, since the day they aren't is the day nothing would work and
 * nothing would say why.
 *
 * For phones on the LAN both must point at the machine's **IP**, not
 * `localhost`: a phone resolving `localhost` resolves itself.
 */
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

export const WS_URL =
  import.meta.env.VITE_WS_URL || `${API_URL.replace(/^http/, 'ws')}/quizwizz/socket`;

/** Base path for the three HTTP doors. Everything after them is the socket. */
const BASE = '/quizwizz';

/**
 * A refusal from one of the three doors.
 *
 * `reason` is the field to branch on — never the message, never the status
 * alone. The server answers every refusal as `{ error, reason }` with `reason`
 * drawn from the protocol's union, which is what lets a join form tell
 * `name_rejected` (say something vague) from `avatar_rejected` (a bug in our
 * picker) when both arrive as a 400.
 *
 * `reason` is nullable because a 500 has none: the server only shapes its
 * *expected* refusals this way, and a thrown handler answers `{ error }` alone.
 */
export class QuizWizzError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly reason: QuizWizzReason | null = null,
  ) {
    super(message);
    this.name = 'QuizWizzError';
  }
}

/**
 * Every HTTP call to QuizWizz goes through here.
 *
 * There is no Authorization header and that is not an oversight: all three doors
 * are unauthenticated. The host door takes a password in its body, the join door
 * takes a name, and `/session` is public. The token they hand back authenticates
 * the *socket*, in its query string — so this layer never holds a credential and
 * there is nothing here to forget to attach.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string; reason?: QuizWizzReason }
      | null;
    throw new QuizWizzError(
      body?.error ?? response.statusText,
      response.status,
      body?.reason ?? null,
    );
  }

  return response.json();
}

export const get = <T>(path: string): Promise<T> => request<T>(path);

export const post = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });
