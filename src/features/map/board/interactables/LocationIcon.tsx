import { Location } from '../../../../services/slopbop';

// A location's on-board face: an icon with its name underneath — the
// Shadows-Over-Loathing look. When occupied, a small overlay sits above the
// icon (mirroring the name label below). Tapping opens its panel. Positioning
// is the <Sprite> wrapper's job; this is pure presentation.
export function LocationIcon({
  location,
  occupantCount,
  onClick,
}: {
  location: Location;
  occupantCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center active:opacity-70"
    >
      {/* Top overlay: someone is standing here. The slot is always reserved
          (invisible when empty) so the icon doesn't shift between states. */}
      <span className={`mb-1 ${occupantCount > 0 ? '' : 'invisible'}`}>
        <span className="rounded bg-black/70 px-1.5 py-0.5 text-xs leading-none">
          👤 {occupantCount}
        </span>
      </span>

      <div className="relative w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center text-3xl shadow-lg">
        <div className="absolute inset-0 rounded-2xl border-2 border-white/25 animate-ping [animation-duration:2.5s]" />
        {location.emoji}
      </div>

      <span className="mt-1 px-1.5 rounded bg-black/70 text-xs leading-tight text-center max-w-[6rem]">
        {location.name}
      </span>
    </button>
  );
}
