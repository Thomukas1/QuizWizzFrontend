/**
 * What the warmup puts on the wire — the kit's base plus this format's reveal.
 *
 * Dependency-free, and **copied into the React client** alongside the kit's
 * `view.ts`, so the two halves of `quiz-warmup` describe themselves with one
 * set of types. The frontend's folder for this game is the mirror of this one.
 */
import { QuizCounts, QuizDisplayBase, QuizOutcome, QuizPlayerBase } from '../quizkit/view';

/**
 * ```
 * rules      host   how this format works, read out — once, before the game
 * countdown  3s     the running start
 * ---- then per item ----
 * intro      1.5s   prompt on the TV, buttons dead
 * open       30s    buttons live, tiles lighting up, auto-locks once everyone is in
 * locked     ~1s    buttons dead, drumroll
 * reveal     host   one step, no drama needed
 * ```
 *
 * **The first two run once, before any item**, and every format has them —
 * Match-3 calls its own card `topic` because the thing it reads out is the topic,
 * but the shape is the same: an untimed card the host steps off when the room is
 * looking up, then a countdown so the first question isn't the one nobody was
 * ready for. They are the `opening` stage of the plan, so no item is up on either
 * of them and the phones say to watch the big screen.
 *
 * `intro` exists so nobody wins by having a thumb already on the screen. It
 * matters least here and most in Speedrun, which is exactly why the warmup
 * teaches the rhythm with it.
 */
export type WarmupStep = 'rules' | 'countdown' | 'intro' | 'open' | 'locked' | 'reveal';

/** Absent from the frame until the `reveal` step. Not zeroed, not hidden — absent. */
export interface WarmupReveal {
    correct: string;
    /** Read out when the answer needs a sentence. Null when it doesn't. */
    explain: string | null;
    /** Every option key, zeroes included — a bar of height zero, not a missing bar. */
    counts: QuizCounts;
    /** Who scores. One `+1` flyup per tile. */
    scorers: string[];
}

export interface WarmupDisplayView extends QuizDisplayBase {
    step: WarmupStep;
    reveal: WarmupReveal | null;
}

export interface WarmupPlayerView extends QuizPlayerBase {
    step: WarmupStep;
    /** Null until the reveal — the correct answer never reaches a phone early. */
    outcome: QuizOutcome | null;
    /**
     * **Points this game, so far** — what the phone's footer reads out.
     *
     * Points rather than a count of right answers: points are the unit the
     * evening is played in, and `pointsCorrect` is config that never crosses the
     * wire, so a phone handed a count would have to multiply — which is a client
     * computing a score.
     *
     * Here rather than on `QuizPlayerBase` because the kit cannot compute it.
     * Scoring is the format's own, and Speedrun pays for speed, so there is no
     * shared formula to hoist: each format projects its own.
     *
     * **Counts only items whose answer has already been shown.** That is the
     * trap in this field — see `revealedScore` in index.ts.
     */
    yourScore: number;
}
