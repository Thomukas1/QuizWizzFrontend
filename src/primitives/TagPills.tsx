import { tagColor } from './tagColor';

/**
 * A wrap of Pokémon-style tag pills. Each tag gets a deterministic colour
 * (see {@link tagColor}) so the same tag always looks the same everywhere.
 */
export default function TagPills({
  tags,
  className = '',
}: {
  tags?: string[];
  className?: string;
}) {
  if (!tags?.length) return null;

  return (
    <div className={`flex flex-wrap gap-xs ${className}`}>
      {tags.map(tag => {
        const { bg, fg, outline } = tagColor(tag);
        return (
          <span
            key={tag}
            className="inline-flex items-center px-md py-xs text-xs font-bold uppercase tracking-wide leading-none"
            style={{
              backgroundColor: bg,
              color: fg,
              borderRadius: '9999px',
              // Thin contrasting halo so the vivid label stays legible on any fill.
              textShadow: `-0.5px -0.5px 0 ${outline}, 0.5px -0.5px 0 ${outline}, -0.5px 0.5px 0 ${outline}, 0.5px 0.5px 0 ${outline}`,
            }}
          >
            {tag}
          </span>
        );
      })}
    </div>
  );
}
