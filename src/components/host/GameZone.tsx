import type { ReactNode } from 'react';
import { EmojiStream } from '../EmojiStream';
import type { EmojiFeed } from '../EmojiStream';

/**
 * **The middle 60% — where every scene is played.**
 *
 * The host screen is three fixed slices and only this one changes: the panels
 * either side stay put all evening, so a scene never has to think about the
 * leaderboard and the leaderboard never re-mounts because a scene changed. When
 * a game module's `<Display>` arrives, it renders in here too, on the same three
 * rows, and inherits the emoji field for free.
 *
 * Every scene gets the same shape — a line at the top, the thing itself in the
 * middle, a line at the bottom — so the eye lands in the same place every time
 * the screen changes. It is the difference between a show and a slideshow.
 */
interface GameZoneProps {
  /** The line above. A title, never content. */
  top?: ReactNode;
  /** The line below. Usually what the host should press next. */
  bottom?: ReactNode;
  /** Painted behind everything, inside the zone — confetti, and a game's own sky. */
  backdrop?: ReactNode;
  /** Reactions, rising from the bottom edge of the zone across its full width. */
  feed?: EmojiFeed | null;
  children: ReactNode;
}

export function GameZone({ top, bottom, backdrop, feed, children }: GameZoneProps) {
  return (
    <div className="game-zone">
      {/* Both layers sit behind the content and neither takes a pointer event.
          The emoji field belongs to the zone rather than to a scene, so it keeps
          running across a phase change — the room's reaction doesn't stop
          because the screen moved on.

          **Backdrop first.** Both sit at z-index 0, so paint order is DOM
          order — and a game's sky rendered second would paint over the rising
          emoji, which is the one layer in here the room actually sent. */}
      {backdrop && <div className="game-zone__backdrop">{backdrop}</div>}
      <EmojiStream feed={feed ?? null} variant="zone" />

      <header className="game-zone__top">{top}</header>
      <div className="game-zone__stage">{children}</div>
      <footer className="game-zone__bottom">{bottom}</footer>
    </div>
  );
}
