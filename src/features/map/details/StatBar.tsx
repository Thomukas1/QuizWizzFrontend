import { CSSProperties } from 'react';

export function StatBar({
  emoji,
  name,
  value,
  color,
}: {
  emoji: string;
  name: string;
  value: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const style = { '--stat-color': color, '--stat-pct': `${pct}%` } as CSSProperties;

  return (
    <div className="stat-bar" style={style}>
      <div className="stat-bar-header">
        <span className="stat-bar-icon">{emoji}</span>
        <span className="stat-bar-name">{name}</span>
        <span className="stat-bar-value">{value}</span>
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" />
      </div>
    </div>
  );
}
