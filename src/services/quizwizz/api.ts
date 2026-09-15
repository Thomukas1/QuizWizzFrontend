import { get, post } from './client';
import { writeHostToken, writePlayerIdentity } from './identity';
import type { Avatar, HostLoginResponse, LiveSessionResponse, PlayerJoinResponse } from './protocol';

/**
 * The three doors. Everything after these is the socket.
 *
 * Two of them mint a token, and **this file is the only place a token is
 * written**. The alternative — handing the response back and trusting each
 * caller to persist it — is how a second writer appears and how a reload lands
 * on a join form with a perfectly good pass sitting unused in storage.
 */

/**
 * Password in, host token out.
 *
 * Resumes the live session when there is one, so a reloaded host tab lands back
 * in the running game rather than starting a second one over the top of it.
 *
 * Refuses with `bad_password` (401) or `not_configured` (503 — the server has no
 * host password set, which is a deploy problem and not the operator's fault).
 */
export async function hostLogin(password: string): Promise<HostLoginResponse> {
  const response = await post<HostLoginResponse>('/host/login', { password });
  writeHostToken(response.token);
  return response;
}

/**
 * Is a game running? What the join page asks *before* it offers a name field —
 * `live: false` means show "no game right now" rather than a form whose submit
 * is guaranteed to fail.
 *
 * Public and unauthenticated, so it is also the honest thing for a host tab to
 * poll before logging in.
 */
export const liveSession = (): Promise<LiveSessionResponse> =>
  get<LiveSessionResponse>('/session');

/**
 * Name and avatar in, identity out. No room code to type — there is one live
 * session and the QR code on the TV was the invitation.
 *
 * **The `name` that comes back may not be the one that went in.** It is trimmed,
 * and suffixed on collision (`Ada` → `Ada 2`). Render what the server returned;
 * the phone that shows what was typed is the phone whose owner doesn't recognise
 * themselves on the scoreboard.
 */
export async function join(name: string, avatar: Avatar): Promise<PlayerJoinResponse> {
  const response = await post<PlayerJoinResponse>('/join', { name, avatar });
  // The code is stored with the pass so a later visit can tell "I'm already in
  // this game" from "I'm holding a pass to a game that's over" — see the note
  // on `PlayerIdentity.code`.
  writePlayerIdentity({
    token: response.token,
    playerId: response.playerId,
    code: response.code,
  });
  return response;
}
