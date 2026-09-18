/**
 * **The quiz kit** — the mechanic every quiz format shares, and the reason
 * formats 2–4 are a folder and a registry row rather than a rewrite.
 *
 * These are `games/`-scoped blocks and not root `components/`: they encode a
 * product concept — a question, an option, a tally of who is in — and only a
 * quiz wants them. The line to watch is `<Timer>`, which sits at the root
 * precisely because it does *not* know what a question is. The server draws the
 * same line and calls it **kits and tools**.
 *
 * **`<GameRules>` and `<Countdown>` are the opening pair**, in that order: a
 * held card naming the format and explaining it, then three seconds of starting
 * gun, then the first question. The shell is shared and the words are not — each
 * game writes its own rules as children, because half of what a rules card says
 * is a number off its own frame and the other half is a voice no two formats
 * share. See the `RULES_STEP` / `COUNTDOWN_STEP` ids in those two files for the
 * step a format declares to get them.
 *
 * `view.ts` is copied verbatim from `rubian-server/src/quiz-wizz/Games/quizkit/`
 * and must never be edited here — it is the contract for the shape of
 * `view.state`, and the server's copy is the authority.
 *
 * Import through this barrel, never the file.
 */
export { GameRules, RULES_STEP } from './GameRules';
export { Countdown, COUNTDOWN_STEP } from './Countdown';
export { OptionButtons } from './OptionButtons';
export { OptionGrid } from './OptionGrid';
export { MediaStrip } from './MediaStrip';
export { ExplainNote } from './ExplainNote';
export { LockedInCount } from './LockedInCount';
export { ScorerRoll } from './ScorerRoll';
export { ScorePanel } from './ScorePanel';
export { useAnswerLock } from './useAnswerLock';

export * from './view';
