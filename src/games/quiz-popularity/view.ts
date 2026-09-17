/**
 * What Popularity puts on the wire — the kit's base plus this format's two
 * phases and its chart.
 *
 * Dependency-free, and **copied into the React client** alongside the kit's
 * `view.ts`, so the two halves of `quiz-popularity` describe themselves with one
 * set of types. The frontend's folder for this game is the mirror of this one.
 *
 * The whole format lives in the shape of `PopularityReveal`, and in what is
 * *not* in the frame before it exists: the room's opinion is the answer key, so
 * a tally on screen during either phase ends the format. It is absent from both
 * projections until the chart starts filling — not zeroed, not hidden by CSS,
 * genuinely absent. A client that renders everything it is handed renders the
 * format correctly.
 */
import { QuizDisplayBase, QuizOutcome, QuizPlayerBase } from '../quizkit/view';

/**
 * ```
 * intro       5s     the question on the TV, buttons dead
 * opinion     10s    "which do you actually think?" — auto-locks once everyone is in
 * switch      ~1.2s  buttons dead, the room is told the rules just changed
 * prediction  20s    "which one did the room pick most?" — same four buttons
 * bar1..bar4  ~1.8s  the chart, one bar per beat, lowest first
 * scorers     host   who called it, and the points
 * ```
 *
 * **The same four buttons twice inside a minute**, which is the trap the format
 * sets for itself: without a visible break people answer the second phase on
 * autopilot with their first answer. `phase` on both views is what the client
 * repaints from — a different accent, a glow, a different header — and `switch`
 * is the beat that gives it somewhere to land. It is not a second lead-in: the
 * prediction phase deliberately has none, because by then the question has been
 * on the television for fifteen seconds and the only thing left to do is think
 * about the room.
 *
 * **One step per bar, and the clock paces them.** Four host presses for one
 * chart would be four chances to rush it, and this is the moment the format is
 * carried by — everyone finds out what their friends think and whether they read
 * them right, in the same two seconds. Speedrun collapsed its per-place steps
 * for the opposite reason: there, the places all arrived at once and the
 * suspense was about nothing. Here the order *is* the suspense.
 */
export type PopularityStep =
    | 'intro'
    | 'opinion'
    | 'switch'
    | 'prediction'
    | 'bar1'
    | 'bar2'
    | 'bar3'
    | 'bar4'
    | 'scorers';

/**
 * **Which of the two questions the buttons currently mean** — and null once
 * neither is open.
 *
 * On the frame rather than derived from `step`, for the same reason `TimerKind`
 * is: a client switching on step ids to work out which accent to paint writes
 * this format's table down a second time, in another repo. It is also
 * forward-looking through `switch`, which is the point of that step — the phone
 * repaints to the prediction colours a beat *before* the buttons go live, so
 * nobody's thumb lands on a freshly-coloured button by accident.
 */
export type PopularityPhase = 'opinion' | 'prediction';

/** One column of the chart, once the television has put it up. */
export interface PopularityBar {
    key: string;
    /** Carried here so the chart is one array rather than a join against `item.options`. */
    label: string;
    /** Phase A votes. The y axis, and the only number that was ever secret. */
    votes: number;
}

/**
 * Absent from the frame until the first bar step. Not zeroed, not hidden —
 * absent. This is exactly the case the projection model exists for.
 */
export interface PopularityReveal {
    /**
     * **Lowest first, and only the ones already on screen.** The array grows by
     * one per beat, so its length is the animation's cue and the last element is
     * always the bar that just arrived.
     *
     * Ties inside the ordering break by the option's own order in the item, so
     * the same room produces the same chart twice — it is the only thing
     * separating two equal bars, and an unstable sort would reorder the chart
     * under a re-render.
     */
    bars: PopularityBar[];
    /**
     * How many people answered phase A — the denominator for a percentage.
     *
     * Shipped from the first bar, because a bar with no total is a number
     * without a share, and the room's size is not the secret here.
     */
    totalVotes: number;
    /**
     * **The winning option keys — empty until every bar is up.**
     *
     * Plural, and that is the rule rather than an edge case: everything tied for
     * most-popular is crowned and everyone who predicted *any* of them scores.
     * Losing on a coin toss the room never saw is the kind of unfairness a party
     * remembers, and a three-way split is what the good questions produce.
     *
     * Empty also covers the genuinely empty room: nobody voted, so nothing won
     * and nobody scores.
     */
    crowned: string[];
    /**
     * **Everyone who predicted a crowned option — and null until the `scorers`
     * step.** The crown lands first and the names land after it, because the two
     * seconds in between are the room working out whether it read itself right.
     *
     * Null rather than empty, the same way Speedrun's `crowd` is, and for the
     * same reason: an empty list is a real and very funny answer here — the whole
     * room misread itself — and a television cannot tell "nobody" from "not yet"
     * unless the two look different on the wire. The alternative is the client
     * branching on a step id to find out, which is this format's step table
     * written down twice.
     */
    scorers: string[] | null;
    /** What a correct prediction paid, so the TV's flyup needs no config. */
    pointsCorrect: number;
}

export interface PopularityDisplayView extends QuizDisplayBase {
    step: PopularityStep;
    phase: PopularityPhase | null;
    reveal: PopularityReveal | null;
}

/**
 * How one player did on the item being revealed.
 *
 * **It fills in as the reveal does.** `result` lands with the crown — by which
 * point the chart on the television has already told the whole room, so there is
 * nothing to spoil — and `points` only on the `scorers` step, at the moment
 * their name goes up with everyone else's.
 */
export interface PopularityOutcome {
    /** Judged against the crowned set. `missed` is "didn't predict". */
    result: QuizOutcome;
    /** Points for this item — 0 until the scorers go up. */
    points: number;
}

export interface PopularityPlayerView extends QuizPlayerBase {
    step: PopularityStep;
    phase: PopularityPhase | null;
    /**
     * **"You picked: Fox"** — their phase A answer, kept on the phone through
     * the prediction phase and the reveal.
     *
     * Separate from `yourChoice`, which follows `phase` and is therefore null
     * again the moment the prediction opens: one is the reminder, the other is
     * the locked state of the buttons in front of them. Their own opinion is the
     * one thing about the tally a phone may see early, because it is theirs.
     */
    yourOpinion: string | null;
    /** Null until the crown — nothing about the tally reaches a phone before it. */
    outcome: PopularityOutcome | null;
    /**
     * **Points this game, so far** — what the phone's footer reads out.
     *
     * Points rather than a count of right calls, for the reason the other three
     * formats give: points are the unit the evening is played in and
     * `pointsCorrect` is config that never crosses the wire, so a phone handed a
     * count would have to multiply.
     *
     * **Counts only items whose scorers have already gone up**, which is the
     * same beat the room sees the payout on.
     */
    yourScore: number;
}
