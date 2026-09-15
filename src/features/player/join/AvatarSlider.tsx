import { Avatar } from '../../../components/Avatar';
import { AVATAR_EMOJI } from '../../../services/quizwizz';

/**
 * Pick your face — a swipeable rail of the forty avatars from `config.ts`,
 * chosen for distinct silhouettes and deliberately disjoint from the reaction
 * palette so a floating reaction never looks like somebody's head.
 *
 * **Scrolling past something is not picking it.** The rail snaps, but selection
 * is a tap, and nothing is selected to begin with. That is the picker honouring
 * the same rule the server does — it refuses a join with no avatar rather than
 * substituting a default, precisely so that a picker which quietly pre-selects
 * can't hand fifteen people the same face.
 *
 * Selection is a ring rather than a colour, because a colour change disappears
 * behind the emoji sitting on top of it.
 */
export function AvatarSlider({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (emoji: string) => void;
}) {
  return (
    <div>
      <div className="avatar-slider-frame">
        <div className="avatar-slider" role="radiogroup" aria-label="Pick your face">
          {AVATAR_EMOJI.map(emoji => (
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
              onClick={() => onSelect(emoji)}
            >
              <Avatar avatar={{ kind: 'emoji', emoji }} size={60} />
            </button>
          ))}
        </div>
      </div>
      <p className="avatar-slider__hint">
        {selected ? 'Tap another to change it' : 'Swipe, then tap to pick'}
      </p>
    </div>
  );
}
