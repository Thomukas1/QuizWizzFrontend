import { useSim } from '../../../context/SimContext';
import { isSimLive } from '../../../services/slopbop';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatSimDate(date: string) {
  const [y, mo, d] = date.split('-');
  return `${Number(d)} ${MONTHS[Number(mo) - 1]} ${Number(y)}`;
}

export function SimHud() {
  const { sim } = useSim();

  if (!sim) return null;

  const live = isSimLive(sim);
  const time = sim.sim_time.split('T')[1] ?? sim.sim_time;
  const city = sim.environment?.city.split(',')[0];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 whitespace-nowrap rounded-xl border border-white/15 bg-white/10 px-4 py-2 shadow-md backdrop-blur-sm">
      <div className="flex flex-col leading-tight">
        <span className="text-muted text-xs uppercase tracking-wide">
          {formatSimDate(sim.date)}{city && ` · ${city}`}
        </span>
        <span className="font-display text-sm tabular-nums flex items-center gap-1.5">
          {time}
          <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: live ? '#4ade80' : '#6b7280' }}
            />
            {live ? 'Live' : 'Ended'}
          </span>
        </span>
      </div>
      {sim.weather && (
        <>
          <div className="w-px self-stretch bg-white/20" />
          <span className="text-sm">{sim.weather}</span>
        </>
      )}
    </div>
  );
}
