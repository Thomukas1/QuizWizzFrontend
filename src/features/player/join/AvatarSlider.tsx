import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Avatar } from '../../../components/Avatar';
import { AVATAR_EMOJI } from '../../../services/quizwizz';

/**
 * Select avatar — a swipeable rail of the forty avatars from `config.ts`,
 * chosen for distinct silhouettes and deliberately disjoint from the reaction
 * palette so a floating reaction never looks like somebody's head.
 *
 * **The bracket is the choice.** Whatever the rail settles on between the two
 * marks is what you picked — there is no second gesture, and so no sentence
 * underneath explaining that there is one. The first face is centred on mount,
 * which means the picker is never in a state the Join button has to refuse.
 *
 * That does mean everyone who never swipes lands on the same face. The server
 * allows duplicate avatars on purpose and `<Avatar>` grounds each player in
 * their own hue, so two identical faces are still two tiles on the television.
 *
 * Selection comes *from* the scroll position rather than from a click: the
 * rail's centre is measured on every settle and reported up. Tapping a face
 * (and tabbing to one) scrolls it into the bracket, so the keyboard and the
 * mouse take the same path the thumb does and there is only one way in.
 */
export function AvatarSlider({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (emoji: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  /** The last emoji handed up, so a scroll that stays inside one tile is free. */
  const reported = useRef<string | null>(null);
  const frame = useRef(0);

  // Read at call time, never subscribed to — the scroll listener and the mount
  // effect must not be rebuilt because the parent re-rendered.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  /** Puts a tile under the bracket. The rail is the offset parent. */
  const centreOn = useCallback((index: number, behavior: ScrollBehavior) => {
    const rail = railRef.current;
    const tile = rail?.children[index] as HTMLElement | undefined;
    if (!rail || !tile) return;
    rail.scrollTo({
      left: tile.offsetLeft + tile.offsetWidth / 2 - rail.clientWidth / 2,
      behavior,
    });
  }, []);

  /** Whatever is nearest the middle *is* the selection. */
  const reportCentred = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const middle = rail.scrollLeft + rail.clientWidth / 2;

    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < rail.children.length; i++) {
      const tile = rail.children[i] as HTMLElement;
      const distance = Math.abs(tile.offsetLeft + tile.offsetWidth / 2 - middle);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    }

    const emoji = AVATAR_EMOJI[nearest];
    if (emoji === reported.current) return;
    reported.current = emoji;
    onSelectRef.current(emoji);
  }, []);

  // Mount: park the bracket on whatever is already chosen — the first face when
  // nothing is — and report it, so the form opens valid.
  useLayoutEffect(() => {
    const index = Math.max(0, AVATAR_EMOJI.indexOf(selectedRef.current ?? ''));
    centreOn(index, 'auto');
    reportCentred();
  }, [centreOn, reportCentred]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // One measurement per painted frame. A snapping rail fires scroll events far
  // faster than the highlight can mean anything.
  function handleScroll() {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      reportCentred();
    });
  }

  return (
    <div className="avatar-slider">
      <div
        ref={railRef}
        onScroll={handleScroll}
        className="avatar-slider__rail"
        role="radiogroup"
        aria-label="Select avatar"
      >
        {AVATAR_EMOJI.map((emoji, index) => (
          <button
            key={emoji}
            type="button"
            role="radio"
            aria-checked={selected === emoji}
            aria-label={emoji}
            className={
              'avatar-slider__option' +
              (selected === emoji ? ' avatar-slider__option--selected' : '')
            }
            onClick={() => centreOn(index, 'smooth')}
            onFocus={() => centreOn(index, 'smooth')}
          >
            {/* The tile is `--avatar-slider-item` in the stylesheet; this is that
                measurement less the option's own padding and ring. */}
            <Avatar avatar={{ kind: 'emoji', emoji }} size={96} />
          </button>
        ))}
      </div>
      {/* Painted after the rail so it sits over it, and outside it so the rail's
          edge fade doesn't eat it. */}
      <div className="avatar-slider__bracket" aria-hidden="true" />
    </div>
  );
}
