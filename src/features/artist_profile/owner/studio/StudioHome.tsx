import type { StudioPage } from '../CreatorStudio';

interface Props {
  /** Open a tool. The shell owns which one is up; this just names it. */
  onOpen: (page: StudioPage) => void;
}

/**
 * The studio's front page: the menu of everything an owner can make.
 *
 * Mixtape is deliberately present and disabled rather than absent — the owner
 * should be able to see what the label makes and what isn't ready yet, instead
 * of wondering where it went. An entry becomes real by gaining an `onClick`,
 * which is also what a missing one can't be given by accident.
 *
 * Jam is *absent* rather than disabled, which is the opposite call and means
 * something different: it isn't coming here at all. Jams are curation now — the
 * label starts them behind an api key — so there is nothing an owner is waiting
 * for.
 *
 * Images aren't here: the image studio is a page of its own, reached from the
 * artist's own header. A menu of things this modal builds shouldn't hold one
 * entry that leaves the modal.
 */
export default function StudioHome({ onOpen }: Props) {
  return (
    <>
      <h2 className="font-display text-lg text-center uppercase tracking-wide">
        What would you like to create?
      </h2>
      <div className="flex flex-col gap-sm">
        <StudioOption
          label="Album"
          hint="Yours to write. Releases once it's full."
          onClick={() => onOpen('album')}
        />
        <StudioOption label="Mixtape" hint="Coming soon" />
      </div>
    </>
  );
}

// One row of the menu. No `onClick` is what makes an option unavailable, so a
// coming-soon entry can't be wired up by accident.
function StudioOption({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex flex-col items-center gap-xs w-full rounded-md border-sm border-border
                 bg-transparent px-lg py-md text-center transition-base
                 enabled:hover:border-accent enabled:active:scale-[0.98]"
    >
      <span className="font-display text-sm">{label}</span>
      <span className="text-xs text-muted">{hint}</span>
    </button>
  );
}
