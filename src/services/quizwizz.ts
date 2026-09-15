/**
 * The QuizWizz service: the one folder that talks to the game server.
 *
 * `protocol.ts` and `config.ts` are **copied verbatim** from the server repo
 * (`src/quiz-wizz/`) and must never be edited here. Never type an event name, a
 * refusal reason, or an emoji list — import it. A drifted protocol file is the
 * one bug that produces silence instead of an error.
 */
export * from './quizwizz/protocol';
export * from './quizwizz/config';

export * from './quizwizz/client';
export * from './quizwizz/api';
export * from './quizwizz/clock';

// The store's writers (`apply`, `setStatus`, `setEnding`) belong to `socket.ts`
// alone, and aren't re-exported. Widening them is how a second writer appears
// and the reducer quietly stops being the only way state changes.
export { subscribe, getSnapshot, resetStore } from './quizwizz/store';
export type { QuizWizzState, ConnectionStatus, Ending } from './quizwizz/store';

export { connect, disconnect, send } from './quizwizz/socket';

// Identity is read for display ("you are already joined") and cleared on leave.
// Writing it is `api.ts`'s job — it happens the moment a token is minted.
export { readHostToken, readPlayerIdentity, clearHostToken, clearPlayerIdentity } from './quizwizz/identity';
export type { PlayerIdentity } from './quizwizz/identity';
