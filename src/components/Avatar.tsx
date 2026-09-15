import type { CSSProperties } from 'react';
import type { Avatar as AvatarValue } from '../services/quizwizz';

/**
 * **The only component in the app that looks inside an avatar.**
 *
 * The wire type is a tagged union of one — `{ kind: 'emoji'; emoji }` — and
 * photos are already planned as a second member. The whole point of the union is
 * that adding them touches this file and nothing else, so no other render site
 * may branch on `kind`, and none may reach for `.emoji` directly.
 *
 * `size` is in **pixels**, exactly as it would be on an `<img>` — never a font
 * size. The glyph's size is derived from the box in CSS.
 */

/**
 * A stable colour per player, so two people who picked the same face are still
 * two tiles. With forty emoji and fifteen guests that collision is not an edge
 * case, and the server allows it on purpose.
 *
 * Seeded from the player id where there is one. The picker has no id yet, so it
 * seeds from the emoji instead — which means a face keeps its colour from the
 * moment it's previewed to the moment it lands on the TV.
 */
function groundFor(seed: string): string {
  const hue = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return `hsl(${hue} 65% 45%)`;
}

interface AvatarProps {
  avatar: AvatarValue;
  /** Pixels. The box is square. */
  size: number;
  /** The player's id. Falls back to the avatar's own content when there isn't one. */
  seed?: string;
  /** Greys the tile out. The tile stays put — that's how the room knows it's wifi. */
  offline?: boolean;
}

export function Avatar({ avatar, size, seed, offline }: AvatarProps) {
  const style = {
    '--size': `${size}px`,
    '--avatar-ground': groundFor(seed ?? avatar.emoji),
  } as CSSProperties;

  return (
    <div className={`avatar${offline ? ' avatar--offline' : ''}`} style={style}>
      {avatar.kind === 'emoji' && <span aria-hidden="true">{avatar.emoji}</span>}
      {/* future: avatar.kind === 'image' && <img src={avatar.url} alt="" /> */}
    </div>
  );
}
