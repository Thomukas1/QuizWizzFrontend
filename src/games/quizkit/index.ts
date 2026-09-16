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
 * `view.ts` is copied verbatim from `rubian-server/src/quiz-wizz/Games/quizkit/`
 * and must never be edited here — it is the contract for the shape of
 * `view.state`, and the server's copy is the authority.
 *
 * Import through this barrel, never the file.
 */
export { OptionButtons } from './OptionButtons';
export { OptionGrid } from './OptionGrid';
export { MediaStrip } from './MediaStrip';
export { LockedInCount } from './LockedInCount';
export { ScorerRoll } from './ScorerRoll';
export { ScorePanel } from './ScorePanel';
export { useAnswerLock } from './useAnswerLock';

export * from './view';
