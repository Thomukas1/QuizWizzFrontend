/**
 * Tunables both sides need. Dependency-free, copied into the client alongside
 * `protocol.ts`.
 */

/** Accept a submission this long past `endsAt`, then clamp the recorded elapsed time. */
export const SUBMIT_GRACE_MS = 250;

/** Emoji token bucket, per player. Excess is dropped silently. */
export const REACTION_RATE_PER_SECOND = 5;
export const REACTION_BURST = 10;

/** Bursts are batched to the host at 10Hz; 15 people mashing is otherwise pure noise. */
export const REACTION_FLUSH_MS = 100;
export const REACTION_BATCH_MAX = 120;

/** Engine tick for rounds that ask for one. */
export const TICK_HZ = 10;

/** Heroku closes an idle socket at around 55s, so ping well inside that. */
export const HEARTBEAT_MS = 25_000;

export const NAME_MAX_LENGTH = 14;
export const MAX_PLAYERS = 40;

/** Long enough that a token minted at the start of the party is still good at the end. */
export const TOKEN_TTL_SECONDS = 12 * 60 * 60;

/**
 * No vowels (can't spell anything), no 0/O/1/I/L (can't be misread from the back
 * of the room). The system doc's literal alphabet keeps the `L` its own rule
 * excludes; the rule wins, because `BL89` is the failure it describes.
 */
export const CODE_ALPHABET = 'BCDFGHJKMNPQRSTVWXZ23456789';
export const CODE_LENGTH = 4;

/** Buttons, not a keyboard. */
export const EMOJI_PALETTE: readonly string[] = ['💖', '💀', '🏳️‍🌈', '🤪'];

/**
 * Avatars — what a player picks on the join screen and what represents them on
 * the TV. Forty, because the picker should feel like a choice rather than a
 * dropdown, and one grid of forty still fits a phone screen without scrolling.
 *
 * Deliberately disjoint from `EMOJI_PALETTE`: a reaction floating up the screen
 * must not look like somebody's face. Chosen for distinct silhouettes and colours
 * over cleverness — these are read at a glance, on a tile, from three metres.
 */
export const AVATAR_EMOJI: readonly string[] = [
    '🐙', '🦊', '🐸', '🦉', '🐧', '🦁', '🐼', '🦄', '🐝', '🦋', '🐢', '🦈',
    '🐉', '👽', '🤖', '👻', '🧙', '🦖',
    '🍕', '🌮', '🍄', '🍩', '🥑', '🍒', '🌶️', '🧁',
    '🎸', '🚀', '⚡', '🎲', '🎺', '🏆', '💎', '🕹️',
    '🌵', '🌊', '🌈', '🍀', '☄️', '🔮',
];

/** These names go on a TV. Matched against the name with separators stripped. */
export const BANNED_NAME_FRAGMENTS: readonly string[] = [
    'fuck', 'shit', 'cunt', 'nigg', 'fagg', 'rape', 'hitler',
];
