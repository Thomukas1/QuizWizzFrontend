import Img from '../../primitives/Img';

interface Props {
  coverUrl?: string;
  title: string;
  duration?: number;
  /** Bop count. Absent or 0 shows nothing — an unbopped song is just a song. */
  bops?: number;
  onClick: () => void;
  /** Highlight this row as the track currently playing. */
  active?: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function SingleCard({ coverUrl, title, duration, bops, onClick, active }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-sm w-full text-left cursor-pointer active:opacity-70 transition-base"
    >
      <Img
        src={coverUrl || '/Images/default_song_cover.png'}
        alt={title}
        className="w-10 h-10 rounded-sm flex-shrink-0"
      />
      <div className="flex flex-col flex-1 min-w-0">
        <p className={`text-sm truncate ${active ? 'text-accent font-medium' : ''}`}>{title}</p>
        {!!bops && (
          <span className="text-xs subtle">🤩 {bops}</span>
        )}
      </div>
      {duration != null && (
        <span className="text-sm subtle flex-shrink-0">{formatDuration(duration)}</span>
      )}
    </button>
  );
}
