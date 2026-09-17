/**
 * What Match-3 puts on the wire — the kit's base plus this format's streak grid.
 *
 * Dependency-free, and **copied into the React client** alongside the kit's
 * `view.ts`, so the two halves of `quiz-match3` describe themselves with one set
 * of types. The frontend's folder for this game is the mirror of this one.
 *
 * The other two formats build a reveal that fills in one step at a time, and what
 * is absent from it is absent because the television has not shown it yet. This
 * format has no reveal at all: there is no time for one at eight seconds an item,
 * and a per-item verdict card would compete with the only thing worth looking at.
 * **`rows` is the whole format's feedback**, on screen continuously, and a client
 * that renders it renders the game.
 */
import { QuizDisplayBase, QuizOption, QuizOutcome, QuizPlayerBase } from '../quizkit/view';

/**
 * ```
 * topic      host   the topic card and the two labels — the host starts the barrage
 * countdown  3s     3 · 2 · 1, because this one needs a running start
 * open       8s     × 20, auto-advancing, no intro and no reveal between them
 * summary    host   banks and best runs, once the barrage is over
 * ```
 *
 * `topic` and `summary` are the format's one opening and one closing step;
 * `open` is the only per-item step there is. **No `intro` and no `locked`**: the
 * anti-twitch beat the other formats put in front of every question is the thing
 * this format is deliberately without, and a one-second drumroll twenty times
 * would be twenty seconds of a game that is meant to feel like a barrage.
 */
export type Match3Step = 'topic' | 'countdown' | 'open' | 'summary';

/**
 * What one item did to one player's streak — the animation the tile plays.
 *
 * On the wire rather than diffed out of two consecutive frames, because the
 * streak rule is the game: a client working out that `banks` went up and `streak`
 * went to zero has reimplemented `foldStreak` badly, and the interesting case is
 * the one it gets wrong — `burn` and `miss` look identical in the numbers and are
 * not the same event in the room.
 *
 * | | |
 * |---|---|
 * | `step` | Right, and one closer. A pip lights. |
 * | `bank` | Right, and that was the third. The tile fires off and empties. |
 * | `burn` | Wrong or unanswered, with something to lose. **Make it hurt.** |
 * | `miss` | Wrong or unanswered from zero. Nothing was lost; don't animate it. |
 */
export type Match3Beat = 'step' | 'bank' | 'burn' | 'miss';

/**
 * One player's tile in the grid.
 *
 * Ordered by the roster and **stable on purpose** — tiles that re-sort themselves
 * mid-barrage are unreadable at speed, and the room is tracking specific people
 * rather than a league table. The summary step is where sorting by `banks` is
 * worth doing, and a client can do it there off these same rows.
 */
export interface Match3Row {
    playerId: string;
    /** Pips lit, `0` to `streakLength - 1`. Never `streakLength`: that banks and resets. */
    streak: number;
    /** Points-in-waiting: banks × `pointsPerStreak` is what this game will pay them. */
    banks: number;
    /**
     * Their longest run of consecutive correct answers, **not reset by banking**.
     *
     * So it can exceed `streakLength`, and that is the point: six in a row is two
     * banks and a thing worth saying out loud on the summary card, and `banks: 2`
     * alone cannot tell you whether it was six straight or two lucky threes.
     */
    bestRun: number;
    /** The most recent item's effect. Null before the first item has settled. */
    last: Match3Beat | null;
}

export interface Match3DisplayView extends QuizDisplayBase {
    step: Match3Step;
    /** The round's question, asked once — "Before or after 2014?". The content's title. */
    topic: string;
    /**
     * **The two buttons, round-level and present on every step**, including the
     * topic card where `item` is null and the summary where it is null again.
     *
     * **The keys are always `A` and `B`; only the labels are the round's.** That
     * is the format's contract with its content: a file is twenty items offering
     * the same pair, because the pair belongs to the topic rather than to the
     * song — `Before / After`, `Yes / No`, `Korean / Japanese` — and the phone is
     * two fixed buttons whose captions are set once. So this is the round's own
     * pair rather than the current item's: the labels go up with the topic before
     * the barrage starts, and nothing blinks between items.
     */
    options: QuizOption[];
    /** How many in a row banks a point. Draw this many pips per tile. */
    streakLength: number;
    /**
     * **What one bank pays** — the number on the `+1` flyup, and the one figure
     * on this frame the television prints rather than draws.
     *
     * Every other format keeps `pointsEach` off the wire because the phone is
     * handed `yourScore` already multiplied and the TV has nothing to say about
     * points at all. This format's TV does: `banked` is a payout landing in front
     * of the room, and a payout with no figure on it is just a face. The two ways
     * to get that figure without this field are a client multiplying — which is a
     * client scoring — or a constant in the client that is a second copy of
     * `pointsPerStreak` and silently lies the first time a playlist entry tunes
     * it. So the rate ships, once, and the client only prints it.
     */
    pointsPerStreak: number;
    /**
     * Every player's streak, as of **the last item that has closed** — never the
     * one on screen.
     *
     * That lag is deliberate and it is the format's only secret. A grid that
     * updated on submit would light a pip the instant someone answered, which
     * reveals per-item correctness on the television to a room still answering
     * it. Phones get their own result immediately; the room gets it on the beat.
     */
    rows: Match3Row[];
    /**
     * **Who banked a point on the item that just closed** — the `+1` flyup, and
     * the one interruption a format with no reveal step gets.
     *
     * Its own list rather than a filter the client runs over `rows`, for the
     * reason the whole grid is server-computed: banking is the rule the game *is*,
     * and a client deciding for itself who just scored is that rule written down
     * twice. Empty on most items, and empty on every frame before the first one
     * closes. The avatars are the client's — this is ids, like `answered`.
     *
     * Pop them up over the barrage without pausing it. The next item is already
     * running, which is exactly the feeling: somebody scores and the room does
     * not get to stop and admire it.
     */
    banked: string[];
    /**
     * **The index of the item `rows` and `banked` describe**, or -1 before the
     * first one closes.
     *
     * Here so the flyup fires once. Frames are whole and pushed on every
     * submission, so during one eight-second item a client sees the same `banked`
     * array a dozen times; an animation triggered on "the array is non-empty"
     * fires a dozen times with it. Key it on this number instead — it changes
     * exactly when the beat does.
     */
    settledIndex: number;
}

export interface Match3PlayerView extends QuizPlayerBase {
    step: Match3Step;
    /**
     * The round's two buttons, from the round rather than the item — so the
     * phone can paint them on the topic card and never repaints them.
     */
    options: QuizOption[];
    /**
     * **Their own result on the item on screen, the moment they answer it.**
     *
     * The one place this format departs from "the correct answer never reaches a
     * phone before the reveal", and it departs from it safely: it is only ever
     * set for a player who has already submitted, and a submission is final, so
     * there is nothing here to act on. Null until they answer, null again on the
     * next item. `missed` never appears — an item nobody answered is over before
     * the frame that could carry it.
     *
     * Flash it and move on. Two hundred milliseconds, no text, no delay: at eight
     * seconds an item, anything slower makes the next one feel like an ambush.
     */
    outcome: QuizOutcome | null;
    /**
     * Their pips, **including the item they have just answered**.
     *
     * Ahead of the television's copy of the same number by up to eight seconds,
     * and that is the design: the pip moving *is* the reward for answering, and
     * withholding it until the room finds out would leave the phone flashing
     * green at nothing. The two agree again the moment the item closes.
     */
    streak: number;
    banks: number;
    bestRun: number;
    streakLength: number;
    /**
     * The beat their own last answered item produced — the phone's half of the
     * grid, and `bank` here is their own `+1`.
     *
     * Keyed by `itemIndex` together with `yourChoice`: it belongs to the item on
     * screen once they have answered it, and to the previous one until they do.
     */
    last: Match3Beat | null;
    /**
     * **Points this game, so far** — banked only, and partial streaks are worth
     * nothing.
     *
     * Points rather than banks, for the reason every format's copy of this field
     * says: `pointsPerStreak` is config that never crosses the wire, and a phone
     * handed a count would have to multiply.
     */
    yourScore: number;
}
