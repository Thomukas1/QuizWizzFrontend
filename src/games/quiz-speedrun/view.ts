/**
 * What Speedrun puts on the wire — the kit's base plus this format's reveal.
 *
 * Dependency-free, and **copied into the React client** alongside the kit's
 * `view.ts`, so the two halves of `quiz-speedrun` describe themselves with one
 * set of types. The frontend's folder for this game is the mirror of this one.
 *
 * The whole format lives in the shape of `SpeedrunReveal`: it is built one step
 * at a time, and what is absent from it is absent because the television has not
 * shown it yet. A client that renders everything it is handed renders the format
 * correctly.
 */
import { QuizCounts, QuizDisplayBase, QuizOutcome, QuizPlayerBase } from '../quizkit/view';

/**
 * ```
 * intro   3s     prompt on the TV, buttons dead — the anti-twitch beat
 * open    30s    buttons live, auto-locks once everyone is in
 * locked  ~1s    buttons dead, drumroll
 * answer  host   the correct option, and the bars
 * crowd   host   everyone who got it right, all at once
 * podium  host   every paying place at once, with its time
 * ```
 *
 * **One podium step, not one per place.** It used to be `winners` steps counting
 * down to 1st, and the suspense it was buying did not exist: every place pays the
 * same `pointsEach`, so "who came 2nd" is a fun thing to read off your own face
 * and not a thing worth three host presses and eight seconds. The places and the
 * times all land together and the room reads them at its own speed.
 *
 * The step is skipped entirely when nobody was right, which is why the reveal can
 * end on the crowd saying "Nobody".
 */
export type SpeedrunStep = 'intro' | 'open' | 'locked' | 'answer' | 'crowd' | 'podium';

/** One paying place, once the television has put it on screen. */
export interface SpeedrunPlace {
    playerId: string;
    /** 1-based, and 1 is the fastest correct answer. */
    place: number;
    /** Their own time. Show it — `4.21s` beside a name is what makes this land. */
    elapsedMs: number;
    points: number;
}

/** Absent from the frame until the `answer` step. Not zeroed, not hidden — absent. */
export interface SpeedrunReveal {
    correct: string;
    /** Read out when the answer needs a sentence. Null when it doesn't. */
    explain: string | null;
    /** Every option key, zeroes included — a bar of height zero, not a missing bar. */
    counts: QuizCounts;
    /**
     * **Everyone who got it right, in arrival order — and null until the `crowd`
     * step.** This is the tension the format is carried by: nine names on screen,
     * none of them knowing yet which three are in the money. Narrowing straight
     * to the podium throws the whole thing away.
     */
    crowd: string[] | null;
    /**
     * **Every paying place, worst first — and empty until the `podium` step.**
     *
     * All of them at once, because they arrive at once. Non-empty is therefore
     * also the frame's word for "the podium is up", which is the flag the
     * television's cull is armed by; it replaced a `place` field that, with one
     * step showing everything, could only ever have said `1`.
     */
    podium: SpeedrunPlace[];
    /** How many places pay, so the TV can say what the cull is for. */
    winners: number;
}

export interface SpeedrunDisplayView extends QuizDisplayBase {
    step: SpeedrunStep;
    reveal: SpeedrunReveal | null;
}

/**
 * How one player did on the item being revealed.
 *
 * **It fills in as the reveal does.** `result` lands on the `answer` step, and
 * `place` only when the television has shown that place — a phone that reads
 * "1st · +1" while the room is still looking at the crowd has spoiled the format
 * for whoever is holding it and for anyone stood next to them.
 */
export interface SpeedrunOutcome {
    result: QuizOutcome;
    /** Their place, once it is on screen. Null for everyone the podium doesn't reach. */
    place: number | null;
    /** Points for this item — 0 until their place goes up. */
    points: number;
    /** Their own time, null if they never answered. */
    elapsedMs: number | null;
    /**
     * Every place that was going to be shown has been.
     *
     * The difference between "you were right, and the podium isn't finished" and
     * "you were right and missed it" — which is the phone's whole reveal.
     */
    final: boolean;
}

export interface SpeedrunPlayerView extends QuizPlayerBase {
    step: SpeedrunStep;
    /** Null until the reveal — the correct answer never reaches a phone early. */
    outcome: SpeedrunOutcome | null;
    /**
     * **Points this game, so far** — what the phone's footer reads out.
     *
     * Points rather than places: points are the unit the evening is played in,
     * and `pointsEach` is config that never crosses the wire, so a phone handed a
     * count would have to multiply — which is a client computing a score.
     *
     * **Counts only places the television has already shown**, for the same
     * reason `outcome.place` does. It ticks up on the podium step that names you,
     * which is exactly when the room finds out too.
     */
    yourScore: number;
}
