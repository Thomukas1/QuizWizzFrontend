import { useState, useEffect, useRef } from 'react';

interface Props {
  /** ISO timestamp to count down to. */
  target: string;
  /** Fired once, when the target passes. Typically a refetch, so the server
   *  re-evaluates whatever the deadline was gating. */
  onExpire: () => void;
  /** Wraps the formatted remainder — the caller owns how it looks. */
  render: (remaining: string) => React.ReactNode;
}

/**
 * Live countdown to a moment, ticking each second. Purely a clock: it knows
 * nothing about what the deadline means, which is why both a mixtape's
 * submission window and a jam's two phases can drive off it.
 *
 * `onExpire` fires exactly once per target. It's held in a ref so an inline
 * arrow function from the caller can't restart the interval — and with it the
 * "already fired" flag — on every render.
 */
export function Countdown({ target, onExpire, render }: Props) {
  const [remaining, setRemaining] = useState(() => Date.parse(target) - Date.now());

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    const at = Date.parse(target);
    let fired = false;
    const tick = () => {
      const ms = at - Date.now();
      setRemaining(ms);
      if (ms <= 0 && !fired) {
        fired = true;
        onExpireRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (remaining <= 0) return <span>Updating…</span>;
  return <span>{render(formatRemaining(remaining))}</span>;
}

// Drops the units that don't matter yet: days out, seconds are noise; in the
// last minute they're the whole point.
function formatRemaining(ms: number): string {
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
