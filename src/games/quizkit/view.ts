/**
 * What a quiz puts on the wire — the shared half of every quiz module's
 * `toDisplay` / `toPlayer`.
 *
 * Dependency-free on purpose, and **a published contract**: this file is copied
 * verbatim into the React client alongside `protocol.ts` and `config.ts`, so
 * neither side types a step name or guesses whether a field is present. The
 * engine's `ViewFrame.state` is `unknown`, which means nothing above this file
 * enforces the shape — this is the only place it is written down.
 *
 * The split against `content.ts` is the projection rule made structural: that
 * file holds what sits on disk, which includes the correct answer; this one
 * holds what crosses the wire, which does not until the module puts it there.
 */

/** 2 to 4 of these per item. The letter is what the phone and the TV both show. */
export interface QuizOption {
    key: string;
    label: string;
}

/**
 * Visual flair beside a prompt — a photo to identify, a pair to compare.
 *
 * A tagged union from the first day rather than a bare `url: string`, for the
 * same reason `Avatar` is one: an audio clip is then a second member and a row
 * in the validator, with no change to `QuizItem`, to either view, or to any
 * render site, because the client branches once inside a single `<Media>`
 * component. Two optional fields where exactly one must be set would make the
 * invalid state representable and put a branch at every call site.
 *
 * Empty on every item today. Nothing hosts the bytes yet.
 */
export type QuizMedia = { kind: 'image'; url: string; alt?: string };

/** An item as the **television** may see it: everything except the answer. */
export interface QuizItemView {
    id: string;
    prompt: string;
    options: QuizOption[];
    media: QuizMedia[];
}

/**
 * The part of the TV's frame every quiz format shares. A module spreads this and
 * adds its own reveal — a podium, a bar chart, a streak table — because that is
 * the half no two formats agree on.
 */
export interface QuizDisplayBase {
    /** The module's own step id. `phase === 'GAME'` throughout all of them. */
    step: string;
    /** -1 while the game is in an opening or closing stage with no item up. */
    itemIndex: number;
    itemCount: number;
    item: QuizItemView | null;
    /**
     * **Ids only.** Who has answered, never what they chose — which is why
     * there has never been anything here to leak, even before a reveal.
     */
    answered: string[];
    /**
     * **The denominator in "12 / 15 locked in", and the server's own count.**
     *
     * The client could filter the roster for `connected` itself and usually get
     * the same number — and that is precisely the bug. Who the round is waiting
     * for is the rule the auto-lock acts on, so a client computing its own
     * version writes that rule down twice and the two drift. They drift
     * *visibly*: count everyone and the TV reads "12 / 15" at the exact moment
     * the clock cuts short for 12 of 12 present, which reads as the timer
     * breaking rather than as three people having their phones in their pockets.
     *
     * So the server says what it is waiting for and cuts the clock on the same
     * number. Same fix as `ReactionOption` in [protocol.ts](../../protocol.ts),
     * for the same reason.
     */
    expected: number;
    /** Whether the buttons are live. False through intros, locks and reveals. */
    open: boolean;
}

/**
 * The part of one phone's frame every format shares.
 *
 * No prompt: the question lives on the TV, which keeps everyone's eyes up and
 * means a phone's payload has nothing worth opening devtools for. Labels do
 * ship, so a long option set can be mirrored when it has to be.
 */
export interface QuizPlayerBase {
    step: string;
    itemIndex: number;
    itemCount: number;
    /** Null outside an item — nothing to submit against. */
    itemId: string | null;
    options: QuizOption[];
    open: boolean;
    /**
     * What they locked in, echoed back so a reconnecting phone repaints it.
     *
     * Non-null **is** the locked state: a first submission wins and there is no
     * way to replace it, so a phone with a choice here shows "locked in" and
     * disables its buttons rather than tracking that separately.
     */
    yourChoice: string | null;
    /**
     * The same "12 / 15" the television is showing, as two numbers rather than
     * ids — a phone has no tiles to light up and no business knowing who is
     * still out. Worth having: during a question the phone is exactly where
     * everyone is looking, and "waiting on 3 people" is the difference between
     * a lull and a room wondering whether it broke.
     */
    answeredCount: number;
    expected: number;
}

/** How a player did on the item just revealed. `missed` is "didn't answer". */
export type QuizOutcome = 'correct' | 'wrong' | 'missed';

/** An option's share of the room, for the bars a reveal draws. */
export type QuizCounts = Record<string, number>;

/** 2 is a binary choice, 4 is as many buttons as a thumb can aim at. */
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 4;

/** A prompt plus two references is a screen. Three is a collage nobody reads. */
export const MAX_MEDIA_PER_ITEM = 2;
