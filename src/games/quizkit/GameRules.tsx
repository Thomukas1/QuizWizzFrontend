import type { ReactNode } from 'react';

/**
 * **The card a format opens on: its name, its rules, and what it is about.**
 *
 * The one screen in a round with the room's attention and no clock running, so
 * it is the only place a format gets explained. Match-3 had it first — a
 * sentence and a topic, centred on a held frame, read out loud by the host — and
 * it turned out to be the shape every format wants before its first question.
 *
 * ## The shell is shared; the words are not
 *
 * This component is **layout and typography only**. It knows a card has a name
 * at the top, a body under it and an optional billed line at the bottom; it does
 * not know what any format is, and it never will. Each game writes its own rules
 * in its own voice and hands them over as children:
 *
 * ```tsx
 * <GameRules title="Match-3" subject={{ label: 'Topic', value: topic }}>
 *   <p>{streakLength} correct answers in a row banks you {pointsPerStreak} points.</p>
 * </GameRules>
 * ```
 *
 * That is deliberately not a `rules?: string` on the wire. One string was never
 * going to serve a drawing round and a buzzer race, which is the same reason
 * `ROUND_INTRO` is gone from the engine — and half of what a rules card has to
 * say is a number off its own frame, which a string on disk cannot hold.
 *
 * ## The step it renders on
 *
 * The kit publishes the id but does not enforce it: a format that wants an
 * opening card declares a step under {@link RULES_STEP} in its own plan, and its
 * display branches on it. Match-3's has been called `topic` since before this
 * component existed and stays that way — the id is the server's, and this side
 * does not get to rename one.
 *
 * There is no cue line on it. Every other host screen ends in "SPACE to …"
 * because the host is looking for the next move; this one is read aloud to a
 * room, and a keyboard instruction three metres wide under it is the first thing
 * everybody's eye goes to.
 */

/**
 * The id a format's opening rules step is expected to use.
 *
 * Typed `string` rather than the literal on purpose. Every format's `view.ts` is
 * copied verbatim from the server, so a step the server has not declared yet is
 * not in that file's step union — and a comparison against a literal the union
 * has never heard of is a type error rather than a false branch. Widening here
 * is what lets a display be wired for the card before the server's plan grows
 * one, which is exactly the state three of the four formats are in.
 */
export const RULES_STEP: string = 'rules';

interface GameRulesProps {
  /** The game's name, in the display face. The biggest thing on the card. */
  title: string;
  /** This format's rules, in this format's own words. */
  children: ReactNode;
  /**
   * A billed line under the rules — Match-3's topic, and whatever the next
   * format's equivalent turns out to be. The label sits over the value rather
   * than beside it: "Topic: Before or after 2014?" on one line makes the label
   * part of the sentence.
   */
  subject?: { label: string; value: string } | null;
}

export function GameRules({ title, children, subject }: GameRulesProps) {
  return (
    <div className="quiz-display quiz-card">
      <h2 className="quiz-card__title">{title}</h2>

      <div className="quiz-card__rules">{children}</div>

      {subject && (
        <p className="quiz-card__billing">
          <span className="quiz-card__label">{subject.label}</span>
          <span className="quiz-card__subject">{subject.value}</span>
        </p>
      )}
    </div>
  );
}
