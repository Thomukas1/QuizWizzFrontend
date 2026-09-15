import { createContext, useContext, ReactNode } from 'react';
import { useResource } from '../hooks/useResource';
import { fetchSimCurrent, isSimLive, SimCurrent } from '../services/slopbop';
import { useToast } from './ToastContext';

const POLL_MS = 2 * 60 * 1000;

interface SimState {
  sim: SimCurrent | null;
  loading: boolean;
  refetch: () => void;
}

const SimContext = createContext<SimState | null>(null);

// One shared /sim/current fetch for the whole app — the live simulation. No
// time travel: the cutoff advances on its own as the sim's day unfolds.
export function SimProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const { data: sim, loading, refetch } = useResource(
    () => fetchSimCurrent(),
    'sim-current',
    {
      onError: () => showToast('Failed to load simulation'),
      // Poll while live (or while we have no sim yet); stop once a concluded
      // past sim is in hand — its content can't change.
      pollMs: data => (!data || isSimLive(data) ? POLL_MS : undefined),
    },
  );

  return (
    <SimContext.Provider value={{ sim, loading, refetch }}>
      {children}
    </SimContext.Provider>
  );
}

export function useSim(): SimState {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error('useSim must be used within SimProvider');
  return ctx;
}
