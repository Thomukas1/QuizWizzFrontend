import type { ComponentType, LazyExoticComponent } from 'react';
import type { Avatar, Deadline, PublicPlayer } from '../services/quizwizz';

/**
 * **One server folder, two React components, one line here.**
 *
 * Nothing else in either codebase is touched when a game is added. That property
 * is the whole point of the architecture — protect it. A game that needs a change
 * to the engine, the store or the socket is a game that has found a gap in the
 * protocol, and the fix belongs there rather than in a special case.
 *
 * The props below are fixed, which is what keeps a game from ever touching the
 * socket or the clock: it is handed its state, the roster, the deadline and two
 * senders, and that is the entire world it can see.
 */

/**
 * `state` is the server module's `toDisplay` / `toPlayer` projection. It is
 * `unknown` to the engine and typed per game — declare the type next to the
 * components and keep it identical to what the server projects. That pair of
 * types is the real contract for a round; nothing else checks it.
 */
export interface DisplayProps<S = unknown> {
  state: S;
  players: PublicPlayer[];
  deadline: Deadline | null;
  serverNow: () => number;
}

export interface PlayerProps<S = unknown> {
  /** This phone's projection, and only this phone's. */
  state: S;
  you: { playerId: string; name: string; avatar: Avatar; score: number };
  deadline: Deadline | null;
  serverNow: () => number;
  /** Answers are acknowledged; wait for `answer:ack` before showing one as locked in. */
  answer: (itemId: string, choice: unknown) => void;
  /** The minigame channel: fire and forget. */
  input: (type: string, payload?: unknown) => void;
}

export interface GameComponents {
  /** What the TV shows. */
  Display: LazyExoticComponent<ComponentType<DisplayProps<never>>> | ComponentType<DisplayProps<never>>;
  /** What the phone shows. */
  Player: LazyExoticComponent<ComponentType<PlayerProps<never>>> | ComponentType<PlayerProps<never>>;
}

/**
 * Keyed by `gameId`, matching the server's own registry. Lazy on purpose: a
 * round's components load when `round:begin` names them, so the join screen
 * isn't carrying twelve games it may never play.
 *
 * ```ts
 * 'quiz-deathmatch': {
 *   Display: lazy(() => import('./quiz-deathmatch/Display')),
 *   Player:  lazy(() => import('./quiz-deathmatch/Player')),
 * },
 * ```
 */
export const GAMES: Record<string, GameComponents> = {};

/**
 * Look a game up. **Returns undefined rather than throwing** — an unknown
 * `gameId` renders a placeholder, never a crash. The server refuses an
 * unregistered game when the playlist is set, so the only way to reach this in
 * practice is mid-development, and taking the room's TV down for it would be a
 * poor trade.
 */
export const lookupGame = (gameId: string | null | undefined): GameComponents | undefined =>
  gameId ? GAMES[gameId] : undefined;
